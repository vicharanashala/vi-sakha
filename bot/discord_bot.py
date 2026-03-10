"""
Discord Bot - Vinternship Support Assistant

Integrates with the RAG chatbot to answer student queries in Discord.

Usage:
    python -m bot.discord_bot

Commands:
    !ask <question>  - Ask a question to the support bot
    !help            - Show available commands
    !ping            - Check if bot is online
"""

import discord
from discord.ext import commands
import asyncio
import sys
from pathlib import Path

# Ensure project root is on sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot.config import DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID

# Import RAG components (lazy loaded to avoid slow startup)
_rag_session = None


def get_rag_session():
    """Lazy load RAG session to avoid slow bot startup"""
    global _rag_session
    if _rag_session is None:
        print("Loading RAG system...")
        from bot.rag.chatbot import ChatSession, get_embed_model, get_collection
        # Pre-load models
        get_embed_model()
        get_collection()
        _rag_session = ChatSession()
        print("RAG system ready!")
    return _rag_session


# =============================================================================
# BOT SETUP
# =============================================================================

# Bot intents
intents = discord.Intents.default()
intents.message_content = True  # Required to read message content

# Create bot with command prefix
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


# =============================================================================
# BOT EVENTS
# =============================================================================

@bot.event
async def on_ready():
    """Called when bot is connected and ready"""
    print("=" * 50)
    print(f"Bot connected as: {bot.user.name}")
    print(f"Bot ID: {bot.user.id}")
    print("=" * 50)
    print("Commands: !ask, !help, !ping")
    print("=" * 50)
    
    # Set bot status
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.listening,
            name="!ask for questions"
        )
    )


@bot.event
async def on_command_error(ctx, error):
    """Handle command errors"""
    if isinstance(error, commands.CommandNotFound):
        await ctx.send("❓ Unknown command. Use `!help` to see available commands.")
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send("⚠️ Missing argument. Usage: `!ask <your question>`")
    else:
        print(f"Error: {error}")
        await ctx.send("❌ An error occurred. Please try again.")


# =============================================================================
# BOT COMMANDS
# =============================================================================

@bot.command(name="ping")
async def ping(ctx):
    """Check if bot is online"""
    latency = round(bot.latency * 1000)
    await ctx.send(f"🏓 Pong! Latency: {latency}ms")


@bot.command(name="help")
async def help_command(ctx):
    """Show available commands"""
    embed = discord.Embed(
        title="📚 Vinternship Support Bot",
        description="I can help answer your questions about the Vinternship program!",
        color=discord.Color.blue()
    )
    
    embed.add_field(
        name="Commands",
        value=(
            "`!ask <question>` - Ask a question about the internship\n"
            "`!ping` - Check if bot is online\n"
            "`!help` - Show this help message"
        ),
        inline=False
    )
    
    embed.add_field(
        name="Examples",
        value=(
            "`!ask How do I submit my case study?`\n"
            "`!ask What is the deadline for ViBe completion?`\n"
            "`!ask How are health points calculated?`"
        ),
        inline=False
    )
    
    embed.set_footer(text="For urgent issues, contact support@vinternship.com")
    
    await ctx.send(embed=embed)


@bot.command(name="ask")
async def ask_question(ctx, *, question: str):
    """
    Ask a question to the support bot
    Usage: !ask <your question>
    """
    # Show typing indicator while processing
    async with ctx.typing():
        # Run RAG query in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: get_rag_session().ask(question)
        )
    
    # Build response embed
    if result["status"] == "answered":
        color = discord.Color.green()
        icon = "✅"
    elif result["status"] == "escalated":
        color = discord.Color.orange()
        icon = "⚠️"
    else:
        color = discord.Color.red()
        icon = "❌"
    
    embed = discord.Embed(
        title=f"{icon} Response",
        description=result["answer"],
        color=color
    )
    
    # Add confidence indicator
    if result["scores"]:
        confidence = result["scores"][0]
        conf_label = "High" if confidence >= 0.7 else "Medium" if confidence >= 0.5 else "Low"
        embed.set_footer(text=f"Confidence: {conf_label} ({confidence:.0%})")
    
    if result["status"] == "escalated":
        embed.add_field(
            name="📢 Note",
            value="This query may need human review. Please wait for a team member.",
            inline=False
        )
    
    await ctx.send(embed=embed)


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Start the Discord bot"""
    print("Starting Vinternship Support Bot...")
    print("Loading RAG system in background...")
    
    # Validate token
    if not DISCORD_BOT_TOKEN:
        print("ERROR: DISCORD_BOT_TOKEN not found in .env")
        return
    
    # Run bot
    try:
        bot.run(DISCORD_BOT_TOKEN)
    except discord.LoginFailure:
        print("ERROR: Invalid Discord bot token")
    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    main()
