# ⚠️ DEMO PROJECT - NOT FOR PRODUCTION USE

This project is a demonstration for a re:Invent session and is not intended for production environments. Use for educational and demonstration purposes only.

# AI-Powered Game Design Review System

A demonstration project showcasing how AI agents built with Amazon Bedrock AgentCore can streamline game design review workflows, reducing iteration cycles and enabling analysts to focus on strategic game design decisions.

## Session Abstract

Traditional game design reviews involve inconsistent evaluation methods and subjective feedback that slows down development. In this session, learn to build AI agents with Amazon Bedrock AgentCore that streamline workflows by reducing iteration cycles and allowing analysts to focus on strategic game design. Through live demos and code examples, discover how to combine prompt engineering, RAG, MCP servers, and AgentCore to create intelligent systems that analyze design documents for lore consistency, gameplay alignment, and player engagement.

## Project Structure

```
├── Agents/                          # AI agent implementations
│   ├── basic-strands-agents/        # Basic agent implementations
│   ├── strands-agents-with-memory/  # Advanced agents with memory
│   ├── kb-web-scrapers/            # Knowledge base web scrapers
│   └── New_World_Game_Analysis_System.ipynb  # Analysis notebook
├── Demo Frontend/                   # React frontend application
│   ├── src/                        # Frontend source code
│   └── cdk/                        # AWS CDK infrastructure
└── README.md                       # This file
```

## Key Features

- **Lore Consistency Analysis**: AI agents that analyze design documents for narrative consistency
- **Gameplay Alignment Review**: Automated evaluation of gameplay mechanics alignment
- **Player Engagement Assessment**: AI-powered analysis of player engagement factors
- **RAG Integration**: Retrieval-Augmented Generation for contextual analysis
- **MCP Server Integration**: Model Context Protocol servers for enhanced capabilities

## Technologies Used

- **Amazon Bedrock AgentCore**: Core AI agent framework
- **RAG (Retrieval-Augmented Generation)**: For contextual document analysis
- **MCP Servers**: Model Context Protocol for extended capabilities
- **React + TypeScript**: Frontend interface
- **AWS CDK**: Infrastructure as code
- **Python**: Backend agent implementations

## Getting Started

### Prerequisites

- AWS Account with Bedrock access
- Node.js 18+ and npm
- Python 3.9+
- AWS CLI configured

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accelerate-game-design-reviews-genai-agents
   ```

2. **Install Python dependencies**
   ```bash
   cd Agents
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd "Demo Frontend"
   npm install
   ```

4. **Deploy infrastructure**
   ```bash
   cd cdk
   npm install
   cdk deploy
   ```

## Agent Types

### Basic Agents
- **Lore Agent**: Analyzes narrative consistency
- **Gameplay Agent**: Reviews gameplay mechanics
- **Strategy Agent**: Evaluates strategic elements
- **Game Analyst Agent**: Comprehensive game analysis

### Advanced Agents (with Memory)
Enhanced versions of basic agents with persistent memory capabilities for improved context retention across sessions.

## Demo Components

- **Interactive Frontend**: Web interface for submitting design documents and viewing analysis results
- **Real-time Analysis**: Live demonstration of AI agents processing game design documents
- **Knowledge Base Integration**: Scraped game data for contextual analysis
- **Jupyter Notebook**: Comprehensive analysis system demonstration

## Learning Outcomes

After exploring this demo, you'll understand how to:

1. Build production-ready AI agents with Amazon Bedrock AgentCore
2. Implement prompt engineering for game design analysis
3. Integrate RAG for contextual document processing
4. Deploy MCP servers for extended AI capabilities
5. Create intelligent review systems that accelerate creative development

## Support

This is a demonstration project for re:Invent. For questions about the session content, please refer to the session materials and documentation.
