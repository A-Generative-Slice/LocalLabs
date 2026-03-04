import asyncio
from mcp.server import Server
from mcp.server.models import InitializationOptions
import mcp.types as types
from .rag_engine import RAGEngine
from .parsers import DocumentParser
import os

# Initialize MCP Server
server = Server("mcp-lite-labs-server")
rag_engine = RAGEngine()

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available tools for the AI agent."""
    return [
        types.Tool(
            name="search_documents",
            description="Search through indexed client documents using semantic search",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "n_results": {"type": "integer", "description": "Number of results to return", "default": 5}
                },
                "required": ["query"]
            }
        ),
        types.Tool(
            name="index_directory",
            description="Index a local directory for search",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute path to the directory"}
                },
                "required": ["path"]
            }
        ),
        types.Tool(
            name="read_document",
            description="Read the full content of a specified document",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute path to the file"}
                },
                "required": ["path"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, 
    arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution requests."""
    if not arguments:
        return [types.TextContent(type="text", text="No arguments provided")]

    if name == "search_documents":
        query = arguments.get("query")
        n = arguments.get("n_results", 5)
        results = rag_engine.query(query, n_results=n)
        response_text = "\n\n".join([f"Source: {res['metadata']['source']}\nContent: {res['content']}" for res in results])
        return [types.TextContent(type="text", text=response_text)]

    elif name == "index_directory":
        path = arguments.get("path")
        if not os.path.exists(path):
            return [types.TextContent(type="text", text=f"Path {path} does not exist")]
        rag_engine.index_directory(path)
        return [types.TextContent(type="text", text=f"Successfully indexed {path}")]

    elif name == "read_document":
        path = arguments.get("path")
        content = DocumentParser.parse(path)
        if content:
            return [types.TextContent(type="text", text=content)]
        else:
            return [types.TextContent(type="text", text=f"Could not parse file at {path}")]

    raise ValueError(f"Unknown tool: {name}")

async def run_server():
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="mcp-lite-labs",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=types.NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(run_server())
