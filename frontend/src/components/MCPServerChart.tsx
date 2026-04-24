const resources = [
  "retail_store_inventory.csv",
  "ForecastingService",
  "ReorderService",
  "DataService",
];

const tools = [
  "get_forecast_summary",
  "get_reorder_recommendation",
  "list_available_products",
];

export default function MCPServerChart() {
  return (
    <div className="panel panel-wide">
      <div className="panel-header">
        <div>
          <h3>MCP Server Tool Chart</h3>
          <p className="muted">
            Shows how an MCP-style server exposes inventory tools and resources to the agent.
          </p>
        </div>
        <div className="metric-row compact">
          <div>
            <span className="metric-label">Tools</span>
            <strong>{tools.length}</strong>
          </div>
          <div>
            <span className="metric-label">Resources</span>
            <strong>{resources.length}</strong>
          </div>
        </div>
      </div>

      <div className="mcp-chart" aria-label="MCP server architecture chart">
        <div className="mcp-column">
          <div className="mcp-node user-node">
            <span className="node-kicker">User</span>
            <strong>Inventory manager</strong>
            <p>Asks natural language questions about stock, forecasts, and reorder decisions.</p>
          </div>
        </div>

        <div className="mcp-arrow">-></div>

        <div className="mcp-column">
          <div className="mcp-node agent-node">
            <span className="node-kicker">Agent</span>
            <strong>LangChain ReAct Agent</strong>
            <p>Plans which tool to call, observes the result, and writes the final answer.</p>
          </div>
        </div>

        <div className="mcp-arrow">-></div>

        <div className="mcp-column mcp-server">
          <div className="mcp-node server-node">
            <span className="node-kicker">MCP Server</span>
            <strong>Inventory tool gateway</strong>
            <p>Standard interface for tools and data resources used by the agent.</p>
          </div>
          <div className="mcp-list">
            <span className="node-kicker">Tools</span>
            {tools.map((tool) => (
              <code key={tool}>{tool}</code>
            ))}
          </div>
        </div>

        <div className="mcp-arrow">-></div>

        <div className="mcp-column">
          <div className="mcp-node data-node">
            <span className="node-kicker">Backend</span>
            <strong>Forecast and reorder engine</strong>
            <p>XGBoost forecasting, safety stock, reorder point, and business reasoning.</p>
          </div>
          <div className="mcp-list">
            <span className="node-kicker">Resources</span>
            {resources.map((resource) => (
              <code key={resource}>{resource}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
