import React, { useState, useEffect, useCallback } from 'react';
import { Template } from '/src/types';
import * as db from '/src/services/dbService';
import Card from '/src/components/common/Card';
import Button from '/src/components/common/Button';
import Input from '/src/components/common/Input';
import Textarea from '/src/components/common/Textarea';

const TemplateModal: React.FC<{
  template: Partial<Template> | null;
  onSave: (template: Omit<Template, 'id'> & { id?: string }) => void;
  onClose: () => void;
}> = ({ template, onSave, onClose }) => {
  const [name, setName] = useState(template?.name || '');
  const [prompt, setPrompt] = useState(template?.prompt || '');

  const handleSave = () => {
    if (name && prompt) {
      onSave({ ...template, name, prompt });
    }
  };
  
  const isEditing = !!template?.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">{isEditing ? 'Edit Template' : 'Create New Template'}</h2>
        <div className="space-y-4">
          <Input 
            label="Template Name"
            id="template-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., 'Top 5 List' or 'Versus Comparison'"
          />
          <Textarea
            label="Template Prompt"
            id="template-prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={12}
            placeholder="Write your template prompt for the AI here."
          />
          <div className="text-xs text-slate-400 bg-slate-700 p-2 rounded-md">
            <p className="font-bold">Available Placeholders:</p>
            <ul className="list-disc list-inside ml-2">
                <li><code className="font-mono">{`{{PRODUCT_DETAILS}}`}</code> - Replaced by the list of products.</li>
                <li><code className="font-mono">{`{{GENERAL_SETTINGS}}`}</code> - Replaced by your global AI settings from the dashboard.</li>
                <li><code className="font-mono">{`{{SPECIFIC_INSTRUCTIONS}}`}</code> - Replaced by the instructions you provide right before generating.</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name || !prompt}>Save Template</Button>
        </div>
      </Card>
    </div>
  );
};

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  const loadTemplates = useCallback(() => {
    db.getTemplates()
        .then(setTemplates)
        .catch(e => console.error("Failed to load templates", e));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSave = async (templateData: Omit<Template, 'id'> & { id?: string }) => {
    try {
        if (templateData.id) {
            await db.updateTemplate(templateData as Template);
        } else {
            await db.saveTemplate({ name: templateData.name, prompt: templateData.prompt } as Omit<Template, 'id'>);
        }
        setEditingTemplate(null);
        loadTemplates();
    } catch(e) {
        console.error(e);
        alert('Failed to save template.');
    }
  };
  
  const handleDelete = async () => {
    if(deletingTemplate) {
        try {
            await db.deleteTemplate(deletingTemplate.id);
            setDeletingTemplate(null);
            loadTemplates();
        } catch(e) {
            console.error(e);
            alert('Failed to delete template.');
        }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Manage Prompt Templates</h1>
        <Button onClick={() => setEditingTemplate({})}>Create New Template</Button>
      </div>

      {templates.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-400">You haven't created any templates yet. Create one to get started!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map(template => (
            <Card key={template.id} className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                <div className="flex space-x-2">
                    <Button variant="secondary" onClick={() => setEditingTemplate(template)}>Edit</Button>
                    <Button variant="danger" onClick={() => setDeletingTemplate(template)}>Delete</Button>
                </div>
            </Card>
          ))}
        </div>
      )}

      {editingTemplate && (
        <TemplateModal 
            template={editingTemplate}
            onSave={handleSave}
            onClose={() => setEditingTemplate(null)}
        />
      )}

      {deletingTemplate && (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Confirm Deletion</h2>
                <p className="text-slate-300">Are you sure you want to delete the template "{deletingTemplate.name}"?</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={() => setDeletingTemplate(null)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default Templates;