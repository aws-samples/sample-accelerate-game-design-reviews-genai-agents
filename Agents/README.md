# AI-Powered Game Analyst Solution

## Overview

This agentic solution accelerates game analysts in analyzing game design documents and provides game designers with feedback earlier in the design process to accelerate iteration. This solution uses sample documents related to Amazon Game Studios' MMORPG "New World Aeternum". The system uses specialized AI agents that enable analysts to dive deeper and converse with agents independently or collectively through the Game Analyst Agent orchestrator.

The solution demonstrates how AI agents can enhance analyst productivity by providing instant access to specialized knowledge domains - lore consistency, gameplay balance, and corporate strategy alignment. Game designers receive faster, more comprehensive feedback, enabling rapid iteration and refinement of design proposals.

### Core Architecture

The system consists of four specialized agents:

1. **Game Analyst Agent** - Main orchestrating agent that coordinates between specialists and maintains conversation context
2. **Lore Agent** - Expert in New World's story, world-building, characters, and narrative elements
3. **Gameplay Agent** - Specialist in game mechanics, balance, progression systems, and player engagement
4. **Strategy Agent** - Focused on corporate strategy, performance metrics, and business alignment

Each agent is built using AWS Bedrock AgentCore with the Strands framework and includes sophisticated memory systems for maintaining context across sessions.

### Services Used
- Amazon Bedrock
- Amazon Bedrock AgentCore
- Amazon S3
- Amazon Kendra

## Knowledge Base Overview

| Knowledge Base | Type | Documents | Content Categories | Source |
| --- | --- | --- | --- | --- |
| **New World Design Documents** | Vector (S3) | 468 files | Lore Documents (244), Gameplay Documents (224)| [New World Aeternum Wiki](https://newworld.fandom.com/wiki/New_World_Wiki) |
| **Corporate Strategy Docs** | Kendra GenAI Index| - | Strategic documents, performance metrics | Fictional Documents |

*Note: All data sourced from New World Fandom Wiki via automated crawling and processing for more information see the `kb-web-scrapers` folder*
