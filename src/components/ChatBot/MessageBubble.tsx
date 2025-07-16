import React from "react";
import "./ChatBot.css";
import { themePersonalityMap } from "../../constants/themePersonalitymap";

interface MessageBubbleProps {
  sender: "user" | "wingman";
  text: string;
  timestamp?: string;
}

/**
 * MessageBubble Component
 * Renders individual chat messages with timestamps and sender-specific styling
 * markdown parsing for beautiful display
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({
  sender,
  text,
  timestamp,
}) => {
  /**
   * Formats timestamp into human-readable relative time
   * Provides contextual time display (just now, minutes ago, hours ago, date)
   */
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

    return date.toLocaleDateString();
  };

  /**
   * Provides visual prefix for different message types
   * Shows theme-appropriate circular avatar for AI responses
   */
  const getMessagePrefix = () => {
    if (sender === "wingman") {
      // Get current theme from localStorage
      const savedSettings = localStorage.getItem("userSettings");
      let currentAvatar;

      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          const theme = (settings.theme ||
            "dark") as keyof typeof themePersonalityMap;
          const themeData = themePersonalityMap[theme];
          currentAvatar = themeData?.avatar;
        } catch {
          // Fallback to dark theme avatar
          currentAvatar = themePersonalityMap.dark.avatar;
        }
      } else {
        // Default to dark theme avatar
        currentAvatar = themePersonalityMap.dark.avatar;
      }

      return (
        <img
          src={currentAvatar}
          alt="Wingman"
          className="message-avatar"
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            marginRight: "8px",
            objectFit: "cover",
          }}
        />
      );
    }
    return ""; // Boss messages need no prefix
  };

  /**
   * Optimized thinking section parsing - only parse once
   */
  const parseContent = (content: string) => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    return {
      thinking: thinkMatch ? thinkMatch[1].trim() : null,
      mainContent: content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
    };
  };

  /**
   * Simple thinking section component with subtle styling (deepseek specific)
   */
  const ThinkingSection = ({ thinking }: { thinking: string }) => {
    return (
      <div className="thinking-section-small">
        <div className="thinking-content-small">{thinking}</div>
      </div>
    );
  };

  /**
   * Parse and render markdown content including tables
   * Handles headers, bold text, tables, and other markdown elements
   */
  const renderMarkdownContent = (content: string) => {
    // If it's a user message, just return plain text
    if (sender === "user") {
      return <span>{content}</span>;
    }

    // Parse content once for efficiency
    const { thinking, mainContent } = parseContent(content);

    return (
      <div>
        {thinking && <ThinkingSection thinking={thinking} />}
        {mainContent.includes("|") && mainContent.includes("---")
          ? renderMarkdownTable(mainContent)
          : renderMarkdownText(mainContent)}
      </div>
    );
  };

  /**
   * Render markdown table from content
   */
  const renderMarkdownTable = (content: string) => {
    const lines = content.split("\n");
    const tableStart = lines.findIndex((line) => line.includes("|"));

    // Find last table line manually (since findLastIndex is not available in older TypeScript)
    let tableEnd = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes("|")) {
        tableEnd = i;
        break;
      }
    }

    if (tableStart === -1 || tableEnd === -1) {
      return renderMarkdownText(content);
    }

    const beforeTable = lines.slice(0, tableStart).join("\n");
    const tableLines = lines
      .slice(tableStart, tableEnd + 1)
      .filter((line) => line.trim());
    const afterTable = lines.slice(tableEnd + 1).join("\n");

    // Parse table
    const headerLine = tableLines[0];
    const separatorIndex = tableLines.findIndex((line) => line.includes("---"));
    const dataLines = tableLines.slice(separatorIndex + 1);

    if (!headerLine || dataLines.length === 0) {
      return renderMarkdownText(content);
    }

    const headers = headerLine
      .split("|")
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    const rows = dataLines.map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0),
    );

    return (
      <div className="markdown-content">
        {beforeTable && renderMarkdownText(beforeTable)}
        <div className="markdown-table-container">
          <table className="markdown-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{renderCellContent(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {afterTable && renderMarkdownText(afterTable)}
      </div>
    );
  };

  /**
   * Render cell content with emoji and formatting support
   */
  const renderCellContent = (cell: string) => {
    // Handle status emojis and formatting
    if (
      cell.includes("✅") ||
      cell.includes("❌") ||
      cell.includes("⏳") ||
      cell.includes("🟢") ||
      cell.includes("🔴")
    ) {
      return <span className="status-cell">{cell}</span>;
    }
    return cell;
  };

  /**
   * Render basic markdown text (headers, bold, italic)
   */
  const renderMarkdownText = (content: string) => {
    const lines = content.split("\n");
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      if (line.trim() === "") {
        elements.push(<br key={index} />);
        return;
      }

      // Handle headers
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={index} className="markdown-h2">
            {line.slice(3)}
          </h2>,
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={index} className="markdown-h3">
            {line.slice(4)}
          </h3>,
        );
        return;
      }

      // Handle bullet points
      if (line.startsWith("- ")) {
        elements.push(
          <li key={index} className="markdown-li">
            {renderInlineMarkdown(line.slice(2))}
          </li>,
        );
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={index} className="markdown-p">
          {renderInlineMarkdown(line)}
        </p>,
      );
    });

    return <div className="markdown-content">{elements}</div>;
  };

  /**
   * Render inline markdown (bold, italic)
   */
  const renderInlineMarkdown = (text: string) => {
    // Handle **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={keyCounter++} className="markdown-bold">
          {match[1]}
        </strong>,
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`chatbot-bubble ${sender}`}>
      <div className="message-content">
        {getMessagePrefix()}
        <div className="message-text">{renderMarkdownContent(text)}</div>
      </div>
      {timestamp && (
        <div className="message-timestamp">{formatTimestamp(timestamp)}</div>
      )}
    </div>
  );
};

export default MessageBubble;
