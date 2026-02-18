import { useState, useMemo, useEffect } from "react";

export const usePagination = <T>(allItems: T[], itemsPerPage = 4) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(allItems.length / itemsPerPage));
  }, [allItems.length, itemsPerPage]);

  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allItems.slice(startIndex, endIndex);
  }, [allItems, currentPage, itemsPerPage]); // re-calculates if these change

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages)); // so it doesn't go past totalPages
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1)); // so it doesn't go under 1
  };

  return {
    currentPage,
    totalPages,
    currentPageItems,
    goToNextPage,
    goToPreviousPage,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  };
};
