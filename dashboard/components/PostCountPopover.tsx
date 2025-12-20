'use client';

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface PostCountPopoverProps {
  onSelect: (count: number) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}

const PRESET_OPTIONS = [10, 20, 50, 100];

export function PostCountPopover({ onSelect, onClose, anchorRef }: PostCountPopoverProps) {
  const [customValue, setCustomValue] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calcul de la position du popover
  useEffect(() => {
    if (anchorRef.current && popoverRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();

      // Position sous le bouton, aligné à droite
      setPosition({
        top: anchorRect.bottom + 8,
        left: anchorRect.right - popoverRect.width,
      });
    }
  }, [anchorRef]);

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  function handleSelect(count: number) {
    onSelect(count);
    onClose();
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const count = parseInt(customValue);
    if (count > 0 && count <= 200) {
      handleSelect(count);
    }
  }

  return (
    <div
      ref={popoverRef}
      className="fixed z-popover bg-surface rounded-lg border border-neutral-200 shadow-dropdown animate-scale-in"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="p-2 min-w-[180px]">
        {/* Header */}
        <div className="px-2 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Nombre de posts
        </div>

        {/* Preset options */}
        <div className="space-y-0.5">
          {PRESET_OPTIONS.map(count => (
            <button
              key={count}
              onClick={() => handleSelect(count)}
              className="w-full px-3 py-2 text-sm text-left rounded-md hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center justify-between group"
            >
              <span>{count} posts</span>
              <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="my-2 border-t border-neutral-100" />

        {/* Custom input */}
        <form onSubmit={handleCustomSubmit} className="px-2">
          <label className="block text-xs text-neutral-600 mb-1.5">
            Personnalisé
          </label>
          <input
            type="number"
            min="1"
            max="200"
            placeholder="ex: 30"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-md focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            autoFocus
          />
          <button
            type="submit"
            disabled={!customValue || parseInt(customValue) <= 0 || parseInt(customValue) > 200}
            className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Collecter
          </button>
        </form>
      </div>
    </div>
  );
}
