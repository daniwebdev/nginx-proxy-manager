import * as api from "./base";

export async function getProxyHostLogs(id: number, logType: "access" | "error"): Promise<{ id: number; logType: string; logs: string }> {
	return await api.get({
		url: `/nginx/proxy-hosts/${id}/logs`,
		params: {
			log_type: logType,
		},
	});
}
