export * from './metricoolMcpClient.js';

import {
  callMetricoolTool as baseCallMetricoolTool,
  getMetricoolTools as baseGetMetricoolTools,
} from './metricoolMcpClient.js';

let latestTools = [];

export async function getMetricoolTools(accessToken) {
  const result = await baseGetMetricoolTools(accessToken);
  latestTools = Array.isArray(result?.tools) ? result.tools : [];
  return result;
}

function resolveSchedulingTool(requestedName) {
  if (!/review/i.test(String(requestedName || ''))) return requestedName;
  const names = latestTools.map(tool => tool?.name).filter(Boolean);
  return names.find(name => name === 'createScheduledPost')
    || names.find(name => name === 'create_scheduled_post')
    || names.find(name => /create.*scheduled.*post/i.test(name) && !/review/i.test(name))
    || names.find(name => /schedule.*post/i.test(name) && !/review/i.test(name))
    || requestedName;
}

function adaptInfoToSchema(toolName, args = {}) {
  const tool = latestTools.find(item => item?.name === toolName);
  const props = tool?.inputSchema?.properties || {};
  if (props.info?.type === 'string' && args.info && typeof args.info !== 'string') {
    return { ...args, info: JSON.stringify(args.info) };
  }
  return args;
}

export async function callMetricoolTool(accessToken, requestedName, args = {}) {
  const toolName = resolveSchedulingTool(requestedName);
  const adaptedArgs = adaptInfoToSchema(toolName, args);
  return baseCallMetricoolTool(accessToken, toolName, adaptedArgs);
}
