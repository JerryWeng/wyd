export class PaginationManager<T> {
  private itemsPerPage: number;
  private currentPage: number;
  private totalPages: number;
  private allItems: T[];

  private prevPageBtn: HTMLButtonElement | null;
  private nextPageBtn: HTMLButtonElement | null;
  private pageNumberDisplay: HTMLElement | null;

  private onPageChangeCallback: (currentPageItems: T[]) => void;

  constructor(
    itemsPerPage = 4,
    onPageChangeCallback: (currentPageItems: T[]) => void = () => {}
  ) {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
    this.totalPages = 1;
    this.allItems = [];

    this.onPageChangeCallback = onPageChangeCallback;

    this.prevPageBtn = document.getElementById(
      "prevPage"
    ) as HTMLButtonElement | null;
    this.nextPageBtn = document.getElementById(
      "nextPage"
    ) as HTMLButtonElement | null;
    this.pageNumberDisplay = document.getElementById("pageNumber");

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () => {
        if (this.goToPreviousPage()) {
          this.onPageChangeCallback(this.getCurrentPageItems());
        }
      });
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => {
        if (this.goToNextPage()) {
          this.onPageChangeCallback(this.getCurrentPageItems());
        }
      });
    }
  }

  setItems(items: T[]) {
    this.allItems = items;
    this.totalPages = Math.max(1, Math.ceil(items.length / this.itemsPerPage));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.updateUI();
  }

  getCurrentPageItems(): T[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(
      startIndex + this.itemsPerPage,
      this.allItems.length
    );
    return this.allItems.slice(startIndex, endIndex);
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateUI();
      return true;
    }
    return false;
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateUI();
      return true;
    }
    return false;
  }

  reset() {
    this.currentPage = 1;
    this.updateUI();
  }

  updateUI() {
    if (this.pageNumberDisplay)
      this.pageNumberDisplay.textContent = `${this.currentPage} of ${this.totalPages}`;

    if (this.prevPageBtn && this.nextPageBtn) {
      this.prevPageBtn.disabled = this.currentPage <= 1;
      this.nextPageBtn.disabled = this.currentPage >= this.totalPages;

      this.prevPageBtn.classList.toggle("disabled", this.currentPage <= 1);
      this.nextPageBtn.classList.toggle(
        "disabled",
        this.currentPage >= this.totalPages
      );
    }
  }
}
