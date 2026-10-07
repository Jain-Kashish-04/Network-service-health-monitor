import React, { useState } from 'react';

/**
 * Reusable form for creating and editing a monitored service.
 * Props:
 *   initialValues – pre-fill form fields when editing
 *   onSubmit(data) – called with { name, url, description }
 *   onCancel – called when the user cancels
 *   submitLabel – button label (default: "Save")
 *   loading – disables submit button
 */
const ServiceForm = ({
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  loading = false,
}) => {
  const [name, setName] = useState(initialValues.name || '');
  const [url, setUrl] = useState(initialValues.url || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Service name is required');
    if (!url.trim()) return setError('URL is required');

    try {
      new URL(url.trim());
    } catch {
      return setError('Please enter a valid URL (e.g. https://example.com)');
    }

    onSubmit({ name: name.trim(), url: url.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="label">Service Name</label>
        <input
          className="input"
          placeholder="e.g. Payment API"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
      </div>

      <div>
        <label className="label">URL</label>
        <input
          className="input"
          placeholder="https://example.com/api"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Must be a public HTTP or HTTPS URL</p>
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <textarea
          className="input resize-none"
          placeholder="What does this service do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ServiceForm;
