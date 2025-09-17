import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  pageButtonCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  pageButtonCount = 5,
}: PaginationProps) {
  // Generate array of page numbers to display
  const generatePageNumbers = () => {
    const pageNumbers = [];
    
    // Calculate range of pages to display
    let startPage = Math.max(1, currentPage - Math.floor(pageButtonCount / 2));
    let endPage = Math.min(totalPages, startPage + pageButtonCount - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < pageButtonCount) {
      startPage = Math.max(1, endPage - pageButtonCount + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1">Anterior</span>
        </Button>
        
        {showPageNumbers && (
          <div className="flex items-center space-x-1">
            {generatePageNumbers().map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className={page === currentPage ? "bg-secondary hover:bg-secondary" : ""}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            ))}
          </div>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="mr-1">Próximo</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
