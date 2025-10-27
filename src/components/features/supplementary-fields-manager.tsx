'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import React from 'react';

export type SupplementaryField = {
  id: string;
  key: string;
  value: string;
};

interface SupplementaryFieldsManagerProps {
  fields: SupplementaryField[];
  onFieldsChange: (fields: SupplementaryField[]) => void;
  title: string;
}

export function SupplementaryFieldsManager({
  fields,
  onFieldsChange,
  title,
}: SupplementaryFieldsManagerProps) {
  const addField = () => {
    onFieldsChange([
      ...fields,
      { id: `field-${Date.now()}`, key: '', value: '' },
    ]);
  };

  const updateField = (
    id: string,
    part: 'key' | 'value',
    newValue: string
  ) => {
    onFieldsChange(
      fields.map((f: SupplementaryField) => (f.id === id ? { ...f, [part]: newValue } : f))
    );
  };

  const removeField = (id: string) => {
    onFieldsChange(fields.filter((f: SupplementaryField) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">{title}</h4>
      {fields.map((field: SupplementaryField) => (
        <div key={field.id} className="flex items-center gap-2">
          <Input
            placeholder="字段名"
            value={field.key}
            onChange={e => updateField(field.id, 'key', e.target.value)}
            className="w-1/3"
          />
          <Input
            placeholder="字段值"
            value={field.value}
            onChange={e => updateField(field.id, 'value', e.target.value)}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeField(field.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addField}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加补充信息
      </Button>
    </div>
  );
}
