import React, { useState, useEffect } from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';

interface InputFieldProps {
  label: string;
  id: string;
  value: number | string;
  onChange: (value: number | string) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  tooltip?: string;
  required?: boolean;
  disabled?: boolean;
}

interface TooltipProps {
  content: string;
}

// Tooltip component
function Tooltip({ content }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="ml-1 text-text_secondary hover:text-primary focus:outline-none"
        aria-label="Show information"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 mt-2 text-xs bg-surface border border-border rounded-md shadow-lg text-text_primary -left-8 top-full">
          {content}
        </div>
      )}
    </div>
  );
}

function InputField({ 
  label, 
  id, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  unit, 
  placeholder,
  tooltip,
  required = false,
  disabled = false
}: InputFieldProps) {
  const [isTouched, setIsTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Validate input when value changes or component mounts
  useEffect(() => {
    if (!isTouched) return;
    
    if (required && (value === '' || value === 0)) {
      setErrorMessage(`${label} is required`);
      return;
    }
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (!isNaN(numValue)) {
      if (min !== undefined && numValue < min) {
        setErrorMessage(`Minimum value is ${min}`);
        return;
      }
      
      if (max !== undefined && numValue > max) {
        setErrorMessage(`Maximum value is ${max}`);
        return;
      }
    }
    
    setErrorMessage(null);
  }, [value, min, max, required, label, isTouched]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === '' ? '' : 
      e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    onChange(newValue);
  };
  
  const handleBlur = () => {
    setIsTouched(true);
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-xs font-medium text-text_secondary mb-1 flex items-center">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <div className="relative rounded-md shadow-sm">
        {unit && unit === '$' && (
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <span className="text-text_secondary sm:text-sm">{unit}</span>
          </div>
        )}
        <input
          type="number"
          name={id}
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={`bg-card border ${errorMessage ? 'border-red-400' : 'border-border'} rounded-lg block w-full sm:text-sm text-text_primary py-1.5 transition-colors duration-150 ${unit === '$' ? 'pl-7' : 'pl-3'} pr-3`}
          aria-invalid={!!errorMessage}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          disabled={disabled}
        />
        {unit && unit !== '$' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-text_secondary sm:text-sm">{unit}</span>
          </div>
        )}
        
        {/* Show error icon if there's an error */}
        {errorMessage && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
        )}
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <p className="mt-1 text-xs text-red-500" id={`${id}-error`}>
          {errorMessage}
        </p>
      )}
      
      {/* Validation hint */}
      {!errorMessage && (min !== undefined || max !== undefined) && (
        <p className="mt-1 text-xs text-text_secondary">
          {min !== undefined && max !== undefined
            ? `Value should be between ${min} and ${max}`
            : min !== undefined
            ? `Minimum value: ${min}`
            : `Maximum value: ${max}`}
        </p>
      )}
    </div>
  );
}

export default InputField; 