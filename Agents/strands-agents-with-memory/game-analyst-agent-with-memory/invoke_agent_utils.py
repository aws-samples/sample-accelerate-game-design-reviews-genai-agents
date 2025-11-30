import boto3
import json
from botocore.config import Config

def invoke_agent_with_boto3(agent_arn, user_query):
    config = Config(read_timeout=300)
    agentcore_client = boto3.client('bedrock-agentcore', config=config)
    
    boto3_response = agentcore_client.invoke_agent_runtime(
        agentRuntimeArn=agent_arn,
        qualifier="DEFAULT",
        payload=json.dumps({"prompt": user_query})
    )
    
    response_body = boto3_response['response'].read()
    return response_body.decode('utf-8')