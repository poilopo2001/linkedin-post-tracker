'use client';

import { useState } from 'react';
import { TrackedPost } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  ThumbsUp, MessageCircle, Wand2, Bookmark, BookmarkCheck,
  Sparkles, ExternalLink
} from 'lucide-react';

interface LinkedInPostCardProps {
  post: TrackedPost;
  authorName?: string;
  authorHeadline?: string;
  authorImage?: string;
  onSpin?: (post: TrackedPost) => void;
  onSave?: (post: TrackedPost) => void;
  onAnalyze?: (post: TrackedPost) => void;
}

export function LinkedInPostCard({
  post,
  authorName = 'Auteur',
  authorImage,
  onSpin,
  onSave,
  onAnalyze
}: LinkedInPostCardProps) {
  const [saved, setSaved] = useState(false);
  const content = post.content || 'Contenu non disponible';

  const handleSave = () => {
    setSaved(!saved);
    onSave?.(post);
  };

  return (
    <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Header - Author info */}
      <div className="p-2.5 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0a66c2] to-[#004182] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 overflow-hidden">
            {authorImage ? (
              <img src={authorImage} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              authorName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Author details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[#000000e6] text-xs truncate">{authorName}</h4>
            <span className="text-[10px] text-[#00000099]">{formatDate(post.posted_at) || 'Récemment'}</span>
          </div>

          {/* External Link */}
          {post.post_url && (
            <a
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-[#00000066] hover:text-[#0a66c2] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Content - 5 lines */}
      <div className="px-2.5 pb-2">
        <p className="text-xs text-[#000000e6] leading-relaxed line-clamp-5">
          {content}
        </p>
      </div>

      {/* Full-width Image */}
      {post.media_url && (
        <div className="w-full h-32 bg-gray-100 overflow-hidden">
          <img
            src={post.media_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Footer: Engagement + Actions */}
      <div className="px-2.5 py-2 bg-[#f8f9fa] border-t border-[#e0e0e0] flex items-center justify-between gap-2 mt-auto">
        {/* Engagement stats */}
        <div className="flex items-center gap-3 text-[11px] text-[#00000099]">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            {post.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {post.comments}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSpin?.(post)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#0a66c2] text-white rounded text-[10px] font-medium hover:bg-[#004182] transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            Spin
          </button>
          <button
            onClick={() => onAnalyze?.(post)}
            className="p-1.5 text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded transition-colors"
            title="Analyser"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className={`p-1.5 rounded transition-colors ${
              saved ? 'text-[#057642] bg-green-50' : 'text-[#00000066] hover:bg-[#00000008]'
            }`}
            title={saved ? 'Sauvegardé' : 'Sauvegarder'}
          >
            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
