<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let status = $state<'waiting' | 'processing' | 'error' | 'success' | 'invalid_format'>('waiting');
	let errorMessage = $state<string | null>(null);
	let fileName = $state<string>('');

	// SECURITY: File validation constants
	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
	const ALLOWED_EXTENSIONS = ['dmb', 'setlist', 'json'];
	const MAX_FILENAME_LENGTH = 255;

	/**
	 * SECURITY: Validates file before processing
	 * Checks file size, extension, and basic integrity
	 */
	function validateFile(file: any, fileHandle: File): { valid: boolean; error?: string } {
		// Check file size
		if (fileHandle.size > MAX_FILE_SIZE) {
			return {
				valid: false,
				error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB, file is ${(fileHandle.size / 1024 / 1024).toFixed(2)}MB`
			};
		}

		// Check file size not zero
		if (fileHandle.size === 0) {
			return {
				valid: false,
				error: 'File is empty'
			};
		}

		// Check filename length
		if (file.name.length > MAX_FILENAME_LENGTH) {
			return {
				valid: false,
				error: `Filename too long. Maximum ${MAX_FILENAME_LENGTH} characters`
			};
		}

		// Validate file extension
		const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
		if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
			return {
				valid: false,
				error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
			};
		}

		return { valid: true };
	}

	/**
	 * SECURITY: Validates JSON schema for different file types
	 */
	function validateJsonSchema(data: any, fileType: string): { valid: boolean; error?: string } {
		// Check for null or undefined
		if (data === null || data === undefined) {
			return { valid: false, error: 'Empty or invalid JSON data' };
		}

		switch (fileType) {
			case 'show':
				// Show must have date and venue
				if (typeof data.date !== 'string' || !data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
					return { valid: false, error: 'Invalid show format: missing or malformed date (YYYY-MM-DD)' };
				}
				if (typeof data.venue !== 'string' || data.venue.length === 0) {
					return { valid: false, error: 'Invalid show format: missing venue' };
				}
				break;

			case 'song':
				// Song must have slug and title
				if (typeof data.slug !== 'string' || data.slug.length === 0) {
					return { valid: false, error: 'Invalid song format: missing slug' };
				}
				if (typeof data.title !== 'string' || data.title.length === 0) {
					return { valid: false, error: 'Invalid song format: missing title' };
				}
				break;

			case 'batch':
				// Batch must be an array
				if (!Array.isArray(data)) {
					return { valid: false, error: 'Invalid batch format: must be an array' };
				}
				if (data.length === 0) {
					return { valid: false, error: 'Invalid batch format: array is empty' };
				}
				// Limit batch size to prevent memory exhaustion
				if (data.length > 1000) {
					return { valid: false, error: 'Batch too large: maximum 1000 items' };
				}
				break;

			case 'concert':
				// Concert must have shows array
				if (!data.shows || !Array.isArray(data.shows)) {
					return { valid: false, error: 'Invalid concert format: missing shows array' };
				}
				if (data.shows.length === 0) {
					return { valid: false, error: 'Invalid concert format: shows array is empty' };
				}
				// Limit concert size to prevent memory exhaustion
				if (data.shows.length > 1000) {
					return { valid: false, error: 'Concert too large: maximum 1000 shows' };
				}
				break;

			default:
				return { valid: false, error: `Unknown file type: ${fileType}` };
		}

		return { valid: true };
	}

	/**
	 * Handle file received via launchQueue API
	 * This is called when the PWA is launched with a file
	 */
	async function handleLaunchQueue() {
		// Check if launchQueue is available (Chrome 73+)
		if (!('launchQueue' in window)) {
			console.warn('launchQueue not supported in this browser');
			return;
		}

		// Set up consumer for launch queue
		(window as any).launchQueue.setConsumer(async (launchParams: any) => {
			try {
				status = 'processing';

				const files = launchParams.files;
				if (!files || files.length === 0) {
					errorMessage = 'No files provided';
					status = 'error';
					return;
				}

				const file = files[0];
				fileName = file.name;

				// Read the file
				const fileHandle = await file.getFile();

				// SECURITY: Validate file before processing
				const fileValidation = validateFile(file, fileHandle);
				if (!fileValidation.valid) {
					errorMessage = fileValidation.error || 'File validation failed';
					status = 'error';
					return;
				}

				const fileText = await fileHandle.text();

				// SECURITY: Parse JSON with error handling
				let fileData: any;
				try {
					fileData = JSON.parse(fileText);
				} catch (parseError) {
					errorMessage = 'Invalid JSON format';
					status = 'error';
					console.error('JSON parse error:', parseError);
					return;
				}

				const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

				// Determine file type
				let fileType: 'show' | 'song' | 'batch' | 'concert' = 'concert';

				if (fileExtension === 'dmb' || fileExtension === 'setlist') {
					// DMB or setlist file - could be show or batch
					if (fileData.date && fileData.venue) {
						fileType = 'show';
					} else if (Array.isArray(fileData)) {
						fileType = 'batch';
					}
				} else if (fileExtension === 'json') {
					// JSON file - inspect contents
					if (fileData.date) {
						fileType = 'show';
					} else if (fileData.slug && fileData.title) {
						fileType = 'song';
					} else if (fileData.shows && Array.isArray(fileData.shows)) {
						fileType = 'concert';
					}
				}

				// SECURITY: Validate JSON schema
				const schemaValidation = validateJsonSchema(fileData, fileType);
				if (!schemaValidation.valid) {
					errorMessage = schemaValidation.error || 'Invalid file schema';
					status = 'error';
					return;
				}

				// SECURITY: Encode file data for URL parameter
				// btoa can fail with Unicode characters, use try-catch
				let encodedData: string;
				try {
					// Convert to UTF-8 safe string before base64 encoding
					const jsonString = JSON.stringify(fileData);
					encodedData = btoa(encodeURIComponent(jsonString));
				} catch (encodeError) {
					errorMessage = 'Failed to encode file data';
					status = 'error';
					console.error('Encoding error:', encodeError);
					return;
				}

				// SECURITY: Check encoded data size before navigation
				// URLs have practical limits, prevent excessive payload
				if (encodedData.length > 100000) {
					errorMessage = 'File data too large to process via URL (>100KB encoded)';
					status = 'error';
					return;
				}

				// Navigate with file data
				await goto(`/open-file?file=${encodedData}&type=${fileType}`);
				status = 'success';
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				errorMessage = `Failed to process file: ${errorMsg}`;
				status = 'error';
				console.error('Launch queue error:', error);
			}
		});
	}

	// Set up launchQueue on mount
	onMount(() => {
		handleLaunchQueue();

		// Update status based on load result
		if (data?.status) {
			const loadedStatus = data.status;
			if (loadedStatus === 'waiting' || loadedStatus === 'processing' || loadedStatus === 'error' || loadedStatus === 'success' || loadedStatus === 'invalid_format') {
				status = loadedStatus;
			}
			if (data.error) {
				errorMessage = data.error;
			}
		}
	});
</script>

<svelte:head>
	<title>Opening File - DMB Almanac</title>
</svelte:head>

<div class="container">
	{#if status === 'waiting'}
		<div class="loading-state">
			<div class="spinner"></div>
			<h1>Opening File</h1>
			<p class="subtitle">Processing your concert data...</p>
		</div>
	{:else if status === 'processing'}
		<div class="loading-state">
			<div class="spinner"></div>
			<h1>Processing File</h1>
			{#if fileName}
				<p class="subtitle">Reading {fileName}...</p>
			{:else}
				<p class="subtitle">Parsing concert data...</p>
			{/if}
		</div>
	{:else if status === 'error'}
		<div class="error-state">
			<div class="error-icon">!</div>
			<h1>Error Opening File</h1>
			{#if errorMessage}
				<p class="error-message">{errorMessage}</p>
			{/if}
			{#if fileName}
				<p class="file-name">File: {fileName}</p>
			{/if}
			<div class="action-buttons">
				<a href="/" class="btn btn-primary">Back to Home</a>
				<a href="/shows" class="btn btn-secondary">Browse Shows</a>
			</div>
		</div>
	{:else if status === 'success'}
		<div class="success-state">
			<div class="success-icon">✓</div>
			<h1>File Processed</h1>
			<p class="subtitle">Redirecting to content...</p>
		</div>
	{/if}
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--space-4);
		background: var(--background);
	}

	.loading-state,
	.error-state,
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		text-align: center;
		max-width: 500px;
		padding: var(--space-8);
		background: var(--background-secondary);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--border-color);
	}

	h1 {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		margin: 0;
		color: var(--foreground);
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Spinner animation */
	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--background-tertiary);
		border-top-color: var(--color-primary-500);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error state */
	.error-state {
		background: linear-gradient(
			135deg,
			var(--color-red-950, #450a0a) 0%,
			var(--color-red-900, #7f1d1d) 100%
		);
		border-color: var(--color-red-800, #b91c1c);
	}

	.error-state h1 {
		color: var(--color-red-200, #fecaca);
	}

	.error-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: var(--color-red-600, #dc2626);
		color: white;
		border-radius: 50%;
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
	}

	.error-message {
		font-size: var(--text-sm);
		color: var(--color-red-200, #fecaca);
		margin: 0;
		padding: var(--space-4);
		background: rgba(0, 0, 0, 0.2);
		border-radius: var(--radius-lg);
		font-family: monospace;
		word-break: break-word;
	}

	.file-name {
		font-size: var(--text-xs);
		color: var(--color-red-300, #fca5a5);
		margin: 0;
		font-style: italic;
	}

	/* Success state */
	.success-state {
		background: linear-gradient(
			135deg,
			var(--color-green-950, #052e16) 0%,
			var(--color-green-900, #14532d) 100%
		);
		border-color: var(--color-green-800, #16a34a);
	}

	.success-state h1 {
		color: var(--color-green-200, #bbf7d0);
	}

	.success-state .subtitle {
		color: var(--color-green-300, #86efac);
	}

	.success-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: var(--color-green-600, #16a34a);
		color: white;
		border-radius: 50%;
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
	}

	/* Action buttons */
	.action-buttons {
		display: flex;
		gap: var(--space-4);
		margin-top: var(--space-2);
		width: 100%;
	}

	.btn {
		flex: 1;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-lg);
		text-decoration: none;
		font-weight: var(--font-medium);
		transition: all var(--transition-fast);
		border: none;
		cursor: pointer;
		font-size: var(--text-sm);
	}

	.btn-primary {
		background: var(--color-primary-600, #2563eb);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-700, #1d4ed8);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.btn-secondary {
		background: var(--background-tertiary);
		color: var(--foreground);
		border: 1px solid var(--border-color);
	}

	.btn-secondary:hover {
		background: var(--background);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.loading-state,
		.error-state,
		.success-state {
			padding: var(--space-6);
		}

		h1 {
			font-size: var(--text-xl);
		}

		.subtitle {
			font-size: var(--text-base);
		}

		.action-buttons {
			flex-direction: column;
		}
	}
</style>
