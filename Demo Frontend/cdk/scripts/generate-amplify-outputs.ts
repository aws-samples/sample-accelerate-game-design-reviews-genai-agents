#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

interface AmplifyOutputs {
  version: string;
  auth: {
    user_pool_id: string;
    user_pool_client_id: string;
    identity_pool_id: string;
    aws_region: string;
    password_policy: {
      min_length: number;
      require_lowercase: boolean;
      require_uppercase: boolean;
      require_numbers: boolean;
      require_symbols: boolean;
    };
  };
  data: {
    url: string;
    aws_region: string;
    default_authorization_type: string;
    authorization_types: string[];
    model_introspection: {
      version: number;
      models: Record<string, any>;
      enums: Record<string, any>;
      nonModels: Record<string, any>;
    };
  };
}

async function getStackOutputs(stackName: string): Promise<Record<string, string>> {
  const client = new CloudFormationClient({ region: process.env.AWS_REGION || 'us-west-2' });
  
  try {
    const command = new DescribeStacksCommand({ StackName: stackName });
    const response = await client.send(command);
    
    if (!response.Stacks || response.Stacks.length === 0) {
      throw new Error(`Stack ${stackName} not found`);
    }
    
    const outputs: Record<string, string> = {};
    const stack = response.Stacks[0];
    
    if (stack.Outputs) {
      for (const output of stack.Outputs) {
        if (output.OutputKey && output.OutputValue) {
          outputs[output.OutputKey] = output.OutputValue;
        }
      }
    }
    
    return outputs;
  } catch (error) {
    console.error(`Error fetching stack outputs for ${stackName}:`, error);
    throw error;
  }
}

async function generateAmplifyOutputs(environment: string): Promise<void> {
  const stackName = `project-portal-backend-${environment}`;
  
  console.log(`Fetching outputs from stack: ${stackName}`);
  const outputs = await getStackOutputs(stackName);
  
  // Validate required outputs
  const requiredOutputs = [
    'AmplifyAuthUserPoolId',
    'AmplifyAuthUserPoolClientId',
    'AmplifyAuthIdentityPoolId',
    'AmplifyAuthRegion',
    'AmplifyDataGraphQLEndpoint',
    'AmplifyDataRegion',
    'AmplifyDataDefaultAuthMode',
  ];
  
  for (const key of requiredOutputs) {
    if (!outputs[key]) {
      throw new Error(`Required output ${key} not found in stack outputs`);
    }
  }
  
  // Build amplify_outputs.json structure
  const amplifyOutputs: AmplifyOutputs = {
    version: '1',
    auth: {
      user_pool_id: outputs.AmplifyAuthUserPoolId,
      user_pool_client_id: outputs.AmplifyAuthUserPoolClientId,
      identity_pool_id: outputs.AmplifyAuthIdentityPoolId,
      aws_region: outputs.AmplifyAuthRegion,
      password_policy: {
        min_length: 8,
        require_lowercase: true,
        require_uppercase: true,
        require_numbers: true,
        require_symbols: true,
      },
    },
    data: {
      url: outputs.AmplifyDataGraphQLEndpoint,
      aws_region: outputs.AmplifyDataRegion,
      default_authorization_type: outputs.AmplifyDataDefaultAuthMode,
      authorization_types: ['AMAZON_COGNITO_USER_POOLS'],
      model_introspection: {
        version: 1,
        models: {},
        enums: {},
        nonModels: {},
      },
    },
  };
  
  // Write to multiple locations
  const outputPaths = [
    path.join(__dirname, '../../amplify_outputs.json'),
    path.join(__dirname, '../../../src/amplify_outputs.json'),
  ];
  
  for (const outputPath of outputPaths) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(amplifyOutputs, null, 2));
    console.log(`✅ Generated amplify_outputs.json at: ${outputPath}`);
  }
  
  console.log('\n📝 Note: Model introspection schema needs to be generated separately.');
  console.log('   Run: npx @aws-amplify/backend-cli generate graphql-client-code');
}

// Main execution
const environment = process.argv[2] || process.env.ENVIRONMENT || 'dev';

generateAmplifyOutputs(environment)
  .then(() => {
    console.log('\n✨ Successfully generated amplify_outputs.json');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error generating amplify_outputs.json:', error);
    process.exit(1);
  });
