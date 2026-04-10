import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '@/services/userService';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, Users, GraduationCap, FileText, X } from 'lucide-react';
import type { SearchResult } from './types';

interface GlobalSearchDropdownProps {
  schoolId: string;
  branchId?: string | null;
  isDirector?: boolean;
}

const typeConfig = {
  student: { icon: GraduationCap, label: 'Student', color: 'bg-primary/8 text-primary' },
  parent: { icon: Users, label: 'Parent', color: 'bg-info/8 text-info' },
  staff: { icon: User, label: 'Staff', color: 'bg-purple-500/8 text-purple-600' },
  document: { icon: FileText, label: 'Document', color: 'bg-warning/8 text-warning-foreground' },
};

export function GlobalSearchDropdown({ schoolId, branchId, isDirector }: GlobalSearchDropdownProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const allResults: SearchResult[] = [];

      const [students, parents, staff] = await Promise.all([
        userService.list({
          role: 'STUDENT',
          schoolId,
          ...(branchId && isDirector ? { branchId } : {}),
          search: searchQuery.trim(),
        }),
        userService.list({
          role: 'PARENT',
          schoolId,
          search: searchQuery.trim(),
        }),
        userService.list({
          role: 'TEACHER',
          schoolId,
          ...(branchId && isDirector ? { branchId } : {}),
          search: searchQuery.trim(),
        }),
      ]);

      (students || []).slice(0, 5).forEach((s: any) => {
        allResults.push({
          id: s.id,
          type: 'student',
          name: s.name || `${s.first_name} ${s.last_name}`,
          route: `/admin/students/${s.id}`,
        });
      });

      (parents || []).slice(0, 5).forEach((p: any) => {
        allResults.push({
          id: p.id,
          type: 'parent',
          name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
          subtitle: p.email,
          route: `/school-dashboard?tab=parents`,
        });
      });

      (staff || []).slice(0, 5).forEach((t: any) => {
        allResults.push({
          id: t.id,
          type: 'staff',
          name: t.name || `${t.first_name} ${t.last_name}`,
          subtitle: t.email,
          route: `/admin/teachers/${t.id}`,
        });
      });

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, branchId, isDirector]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const groupedResults = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          placeholder="Search students, parents, staff..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-9 pr-8 h-9 bg-muted/30 border-border/50 focus:bg-card focus:border-border text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-popover border border-border/50 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-1">
              {Object.entries(groupedResults).map(([type, items]) => {
                const config = typeConfig[type as keyof typeof typeConfig];
                const Icon = config.icon;
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {config.label}s
                    </div>
                    {items.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.name}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}