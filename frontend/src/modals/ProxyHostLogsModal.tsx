import { IconCopy, IconDownload, IconPlayerPause, IconPlayerPlay, IconRefresh } from "@tabler/icons-react";
import EasyModal, { type InnerModalProps } from "ez-modal-react";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-bootstrap";
import Modal from "react-bootstrap/Modal";
import { getProxyHostLogs } from "src/api/backend";
import { Button, Loading } from "src/components";
import { T } from "src/locale";
import "./ProxyHostLogsModal.css";

const showProxyHostLogsModal = (id: number) => {
	EasyModal.show(ProxyHostLogsModal, { id });
};

interface Props extends InnerModalProps {
	id: number;
}

type LogType = "access" | "error";

const ProxyHostLogsModal = EasyModal.create(({ id, visible, remove }: Props) => {
	const [activeTab, setActiveTab] = useState<LogType>("access");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [logs, setLogs] = useState<Record<LogType, string>>({
		access: "",
		error: "",
	});
	const [isCopied, setIsCopied] = useState(false);
	const [isAutoRefresh, setIsAutoRefresh] = useState(false);
	const [autoRefreshInterval, setAutoRefreshInterval] = useState(2); // seconds
	const logViewerRef = useRef<HTMLPreElement>(null);
	const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

	const fetchLogs = async (logType: LogType) => {
		try {
			setIsLoading(true);
			setError(null);
			const data = await getProxyHostLogs(id, logType);
			setLogs((prev: Record<LogType, string>) => ({
				...prev,
				[logType]: data.logs || "",
			}));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	};

	// Scroll to bottom when logs update
	useEffect(() => {
		if (logViewerRef.current && logs[activeTab]) {
			setTimeout(() => {
				if (logViewerRef.current) {
					logViewerRef.current.parentElement?.scrollTo(0, logViewerRef.current.parentElement.scrollHeight);
				}
			}, 0);
		}
	}, [logs[activeTab]]);

	// Initial load
	useEffect(() => {
		if (visible && logs[activeTab] === "") {
			fetchLogs(activeTab);
		}
	}, [visible, activeTab]);

	// Auto-refresh effect - setup/cleanup timer
	useEffect(() => {
		if (isAutoRefresh && visible) {
			// Set timer for auto-refresh
			autoRefreshTimerRef.current = setInterval(() => {
				fetchLogs(activeTab);
			}, autoRefreshInterval * 1000);
		}

		// Cleanup timer when modal closes or auto-refresh is disabled
		return () => {
			if (autoRefreshTimerRef.current) {
				clearInterval(autoRefreshTimerRef.current);
				autoRefreshTimerRef.current = null;
			}
		};
	}, [isAutoRefresh, activeTab, visible]);

	// Update timer interval without restarting
	useEffect(() => {
		if (isAutoRefresh && visible && autoRefreshTimerRef.current) {
			clearInterval(autoRefreshTimerRef.current);
			autoRefreshTimerRef.current = setInterval(() => {
				fetchLogs(activeTab);
			}, autoRefreshInterval * 1000);
		}
	}, [autoRefreshInterval]);

	const handleCopy = () => {
		navigator.clipboard.writeText(logs[activeTab]);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleDownload = () => {
		const element = document.createElement("a");
		const file = new Blob([logs[activeTab]], { type: "text/plain" });
		element.href = URL.createObjectURL(file);
		element.download = `proxy-host-${id}-${activeTab}.log`;
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};

	const handleRefresh = () => {
		fetchLogs(activeTab);
	};

	const toggleAutoRefresh = () => {
		setIsAutoRefresh(!isAutoRefresh);
	};

	return (
		<Modal show={visible} onHide={remove} size="lg">
			<Modal.Header closeButton>
				<Modal.Title>
					<T id="proxy-host.logs" /> (ID: {id})
				</Modal.Title>
			</Modal.Header>
			<Modal.Body className="p-0">
				{error && <Alert variant="danger" className="m-3">{error}</Alert>}
				<div className="card m-0 border-0">
					<div className="card-header">
						<ul className="nav nav-tabs card-header-tabs" data-bs-toggle="tabs">
							<li className="nav-item" role="presentation">
								<a
									href="#"
									className={`nav-link ${activeTab === "access" ? "active" : ""}`}
									onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
										e.preventDefault();
										setActiveTab("access");
									}}
									role="tab"
								>
									access.log
								</a>
							</li>
							<li className="nav-item" role="presentation">
								<a
									href="#"
									className={`nav-link ${activeTab === "error" ? "active" : ""}`}
									onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
										e.preventDefault();
										setActiveTab("error");
									}}
									role="tab"
								>
									error.log
								</a>
							</li>
							<li className="nav-item ms-auto" role="presentation">
								<button
									type="button"
									className={`btn btn-sm btn-icon ${isAutoRefresh ? "btn-primary" : "btn-ghost-primary"}`}
									onClick={toggleAutoRefresh}
									title={isAutoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
								>
									{isAutoRefresh ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
								</button>
								<button
									type="button"
									className="btn btn-sm btn-icon btn-ghost-primary"
									onClick={handleRefresh}
									disabled={isLoading || isAutoRefresh}
									title="Refresh"
								>
									<IconRefresh size={18} />
								</button>
								<button
									type="button"
									className="btn btn-sm btn-icon btn-ghost-primary"
									onClick={handleCopy}
									disabled={!logs[activeTab]}
									title="Copy"
								>
									<IconCopy size={18} />
								</button>
								<button
									type="button"
									className="btn btn-sm btn-icon btn-ghost-primary"
									onClick={handleDownload}
									disabled={!logs[activeTab]}
									title="Download"
								>
									<IconDownload size={18} />
								</button>
							</li>
						</ul>
					</div>
					<div className="card-body p-0">
						{isLoading ? (
							<div className="npm-logs-loading">
								<Loading noLogo />
							</div>
						) : (
							<div className="npm-logs-viewer">
								<pre ref={logViewerRef} className="npm-logs-content">
									{logs[activeTab] || (
										<span className="npm-logs-empty">
											<T id="no-data-available" />
										</span>
									)}
								</pre>
							</div>
						)}
						{isAutoRefresh && (
							<div className="npm-logs-status">
								<small>
									Auto-updating every {autoRefreshInterval} second{autoRefreshInterval !== 1 ? "s" : ""}
									{" "}
									<select
										value={autoRefreshInterval}
										onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
											setAutoRefreshInterval(Number.parseInt(e.target.value, 10))
										}
										className="npm-logs-interval-select"
									>
										<option value="1">1s</option>
										<option value="2">2s</option>
										<option value="3">3s</option>
										<option value="5">5s</option>
										<option value="10">10s</option>
									</select>
								</small>
							</div>
						)}
						{isCopied && (
							<div className="alert alert-success mt-0 mb-0 npm-logs-copied">
								<T id="copied" />
							</div>
						)}
					</div>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button data-bs-dismiss="modal" onClick={remove}>
					<T id="close" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
});

export { showProxyHostLogsModal };
