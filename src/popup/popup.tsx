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
import Settings from '../components/Settings';
import BlockPage from '../components/BlockPage';
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
        currentView,
        handleCategorySwitch,
        handleSortSelect,
        openSettings,
        openBlockPage,
        closeView,
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
            {currentView === 'settings' && <Settings onClose={closeView} />}
            {currentView === 'block' && <BlockPage onClose={closeView} />}
            {currentView === 'main' && (<>
                {/* Header */}
                <div className="subcontainer">
                    <div className="title">
                        <div className="logo"><img src="/icons/icon16.png" alt="Logo" /></div>
                        <div className="logoName">WhatAreYouDoing</div>
                    </div>
                    <div className="options">
                        <button id="blockBtn" onClick={openBlockPage} title="Block rules">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                                <path d="M6.34 6.34L17.66 17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>
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
                        <div id="sortSegment">
                            {(['time', 'session', 'domain'] as const).map((type) => {
                                const labels = { time: 'Time', session: 'Sessions', domain: 'Domain' };
                                const isActive = filterBy === type;
                                return (
                                    <button
                                        key={type}
                                        className={`sort-seg-btn${isActive ? ' active' : ''}`}
                                        onClick={() => handleSortSelect(type)}
                                    >
                                        {isActive && (
                                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={sortOrder === 'ascending' ? 'sort-asc' : 'sort-desc'}>
                                                <path d="M7 5V19M7 19L4 16M7 19L10 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M17 19V5M17 5L14 8M17 5L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                        <span className="ctrl-label">{labels[type]}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div id="paginationControls">
                            <button id="prevPage" className="pageControl" onClick={goToPreviousPage} disabled={isFirstPage}>
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                if (img.src.includes('google.com')) {
                                                    img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
                                                } else if (img.src.includes('duckduckgo.com')) {
                                                    img.src = `https://${domain}/favicon.ico`;
                                                } else {
                                                    img.src = '/icons/default.png';
                                                }
                                            }} />
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
            </>)}
        </div>
    );
};

export default Popup;