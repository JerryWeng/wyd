// css imports
import './css/infoControl.css';
import './css/pieChart.css';
import './css/popup.css';
import './css/stats.css';

// image imports
import SettingsIcon from '../assets/icons/settings.png';

// hook and utility imports
import { useState, useRef } from 'react';
import { usePopupController } from '../hooks/usePopupController';
import { usePagination } from '../hooks/usePagination';
import PieChart from '../components/PieChart';
import { TimeFormatter } from '../utils/timeFormatter';
import { DataProcessor } from '../utils/dataProcessor';

const Popup = () => {
    const {
        isLoading,
        error,
        sortedSites,
        currentCategory,
        filterBy,
        sortOrder,
        handleCategorySwitch,
        toggleSortOrder,
        toggleFilter,
        openSettings,
        allData
    } = usePopupController();

    const {
        currentPage,
        totalPages,
        currentPageItems,
        goToNextPage,
        goToPreviousPage,
        goToPage,
        isFirstPage,
        isLastPage
    } = usePagination(sortedSites, 4);

    const [isEditingPage, setIsEditingPage] = useState(false);
    const [pageInput, setPageInput] = useState('');
    const pageInputRef = useRef<HTMLInputElement>(null);

    const startEditingPage = () => {
        setPageInput(String(currentPage));
        setIsEditingPage(true);
        setTimeout(() => pageInputRef.current?.select(), 0);
    };

    const commitPageInput = () => {
        const parsed = parseInt(pageInput, 10);
        if (!isNaN(parsed)) goToPage(parsed);
        setIsEditingPage(false);
    };

    return (
        <div className="container">
            {/* Header */}
            <div className="subcontainer">
                <div className="title">
                    <div className="logo"><img src="/icons/icon16.png" alt="Logo" /></div>
                    <div className="logoName">WhatAreYouDoing</div>
                </div>
                <div className="options">
                    <button id="settingsBtn" onClick={openSettings}>
                        <img src={SettingsIcon} alt="settings gear" />
                    </button>
                </div>
            </div>

            {/* Chart + Category selector - unified card */}
            <div id="chart-section">
                <span id="date-range-label">{TimeFormatter.getDateRangeLabel(currentCategory)}</span>
                <PieChart data={DataProcessor.processDataForChart(allData)} />
                <div className="categories">
                    <button className={currentCategory === 'today' ? 'active' : ''} onClick={() => handleCategorySwitch('today')}>Today</button>
                    <button className={currentCategory === '1W' ? 'active' : ''} onClick={() => handleCategorySwitch('1W')}>1W</button>
                    <button className={currentCategory === '1M' ? 'active' : ''} onClick={() => handleCategorySwitch('1M')}>1M</button>
                    <button className={currentCategory === '1Y' ? 'active' : ''} onClick={() => handleCategorySwitch('1Y')}>1Y</button>
                    <button className={currentCategory === 'total' ? 'active' : ''} onClick={() => handleCategorySwitch('total')}>Total</button>
                </div>
            </div>

            {/* Controls */}
            <div id="controlContainer">
                <div id="infoControls">
                    <div id="sortControls">
                        <div id="filterBtn" onClick={toggleFilter}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 4.6C3 4.04 3 3.76 3.109 3.546C3.205 3.358 3.358 3.205 3.546 3.109C3.76 3 4.04 3 4.6 3H19.4C19.96 3 20.24 3 20.454 3.109C20.642 3.205 20.795 3.358 20.891 3.546C21 3.76 21 4.04 21 4.6V6.337C21 6.582 21 6.704 20.972 6.819C20.948 6.921 20.908 7.019 20.853 7.108C20.791 7.209 20.704 7.296 20.531 7.469L14.469 13.531C14.296 13.704 14.209 13.791 14.147 13.892C14.093 13.981 14.052 14.079 14.028 14.181C14 14.296 14 14.418 14 14.663V17L10 21V14.663C10 14.418 10 14.296 9.972 14.181C9.948 14.079 9.907 13.981 9.853 13.892C9.791 13.791 9.704 13.704 9.531 13.531L3.469 7.469C3.296 7.296 3.209 7.209 3.147 7.108C3.093 7.019 3.052 6.921 3.028 6.819C3 6.704 3 6.582 3 6.337V4.6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="ctrl-label">{filterBy === 'time' ? 'Time' : 'Sessions'}</span>
                        </div>
                        <div id="sortBtn" onClick={toggleSortOrder}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={sortOrder === 'ascending' ? 'sort-asc' : 'sort-desc'}>
                                <path d="M7 5V19M7 19L4 16M7 19L10 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17 19V5M17 5L14 8M17 5L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="ctrl-label">{sortOrder === 'ascending' ? '↑' : '↓'}</span>
                        </div>
                    </div>
                    <div id="paginationControls">
                        <button id="prevPage" className="pageControl" onClick={goToPreviousPage} disabled={isFirstPage}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        <div id="pageNumber">
                            {isEditingPage ? (
                                <input
                                    id="pageInput"
                                    ref={pageInputRef}
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onBlur={commitPageInput}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitPageInput();
                                        if (e.key === 'Escape') setIsEditingPage(false);
                                    }}
                                />
                            ) : (
                                <span id="currentPageNum" onClick={startEditingPage} title="Click to jump to page">{currentPage}</span>
                            )}
                            {' '}of {totalPages}
                        </div>
                        <button id="nextPage" className="pageControl" onClick={goToNextPage} disabled={isLastPage}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Container - Now renders based on state */}
            <div id="infoContainer">
                {isLoading ? (
                    <div className="loading">Loading...</div>
                ) : error ? (
                    <div className="error">{error}</div>
                ) : currentPageItems.length === 0 ? (
                    <div className="no-data">No browsing data available yet.</div>
                ) : (
                    <>
                        {currentPageItems.map(([domain, data]) => (
                            <div className="stats-item" key={domain}>
                                <div className="site-info">
                                    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                        alt={domain}
                                        className="site-favicon"
                                        onError={(e) => { e.currentTarget.src = '../../assets/icons/default.png'; }} />
                                    <span className="site-name">{domain}</span>
                                </div>
                                <div className="time-info">
                                    <div className="time-spent">{TimeFormatter.formatTimeDisplay(data.time)}</div>
                                    <div className="session-count">{data.sessions} {data.sessions === 1 ? "session" : "sessions"}</div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default Popup;