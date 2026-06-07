// css imports
import './css/infoControl.css';
import './css/pieChart.css';
import './css/popup.css';
import './css/stats.css';

// image imports
import SettingsIcon from '../assets/icons/settings.png';

// hook and utility imports
import { useState, useRef, useMemo } from 'react';
import { usePopupController } from '../hooks/usePopupController';
import { usePagination } from '../hooks/usePagination';
import PieChart from '../components/PieChart';
import Settings from '../components/Settings';
import BlockPage from '../components/BlockPage';
import AuthPanel from '../components/AuthPanel';
import AccountPanel from '../components/AccountPanel';
import './css/auth.css';
import TotalDropdown from '../components/TotalDropdown';
import DateRangeCalendar from '../components/DateRangeCalendar';
import { TimeFormatter } from '../utils/timeFormatter';
import { DataProcessor } from '../utils/dataProcessor';

const Popup = () => {
    const {
        isLoading,
        error,
        sortedSites,
        currentUICategory,
        dateRange,
        filterBy,
        sortOrder,
        currentView,
        session,
        userRecord,
        handleCategorySwitch,
        switchToDateRange,
        handleDateRangeSelect,
        handleSortSelect,
        openSettings,
        openBlockPage,
        openAuth,
        openAccount,
        handleAuthSuccess,
        handleSignOut,
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

    const [isTotalDropdownOpen, setIsTotalDropdownOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const totalBtnRef = useRef<HTMLButtonElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const chartData = useMemo(() => DataProcessor.processDataForChart(allData), [allData]);


    const handleTotalMouseEnter = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setIsTotalDropdownOpen(true);
    };

    const handleTotalMouseLeave = () => {
        closeTimerRef.current = setTimeout(() => setIsTotalDropdownOpen(false), 100);
    };

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
            {currentView === 'auth' && <AuthPanel onSuccess={handleAuthSuccess} onClose={closeView} />}
            {currentView === 'account' && <AccountPanel userRecord={userRecord} onSignOut={handleSignOut} onClose={closeView} />}
            {isCalendarOpen && (
                <DateRangeCalendar
                    onConfirm={(start, end) => {
                        handleDateRangeSelect(start, end);
                        setIsCalendarOpen(false);
                    }}
                    onCancel={() => setIsCalendarOpen(false)}
                    initialRange={dateRange}
                />
            )}
            {currentView === 'main' && (<>
                {/* Header */}
                <div className="subcontainer">
                    <div className="title">
                        <div className="logo"><img src="/icons/icon16.png" alt="Logo" /></div>
                        <div className="logoName">WhatAreYouDoing</div>
                    </div>
                    <div className="options">
                        <button
                            className={`account-btn${session ? ' signed-in' : ''}`}
                            onClick={session ? openAccount : openAuth}
                            title={session ? 'Account' : 'Sign in'}
                        >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button id="donateBtn" onClick={() => window.open('https://ko-fi.com/jerryweng', '_blank')}>
                            <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.81 2.5C11.79 2.5 13.13 4.36 13.13 6.1C13.13 9.62 7.6 12.5 7.5 12.5C7.4 12.5 1.88 9.62 1.88 6.1C1.88 4.36 3.21 2.5 5.19 2.5C6.33 2.5 7.07 3.07 7.5 3.57C7.93 3.07 8.68 2.5 9.81 2.5Z" stroke="#f87171" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button id="blockBtn" onClick={openBlockPage} title="Block rules">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                <path d="M6.34 6.34L17.66 17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button id="settingsBtn" onClick={openSettings}>
                            <img src={SettingsIcon} alt="settings gear" />
                        </button>
                    </div>
                </div>

                {/* Chart + Category selector - unified card */}
                <div id="chart-section">
                    <span id="date-range-label">{TimeFormatter.getDateRangeLabel(currentUICategory, dateRange)}</span>
                    <PieChart data={chartData} />
                    <div className="categories">
                        <button className={currentUICategory === 'today' ? 'active' : ''} onClick={() => handleCategorySwitch('today')}>Today</button>
                        <button className={currentUICategory === '1W' ? 'active' : ''} onClick={() => handleCategorySwitch('1W')}>1W</button>
                        <button className={currentUICategory === '1M' ? 'active' : ''} onClick={() => handleCategorySwitch('1M')}>1M</button>
                        <button className={currentUICategory === '1Y' ? 'active' : ''} onClick={() => handleCategorySwitch('1Y')}>1Y</button>
                        <button
                            ref={totalBtnRef}
                            className={`total-btn${currentUICategory === 'total' || currentUICategory === 'dateRange' ? ' active' : ''}`}
                            onClick={() => currentUICategory === 'dateRange' ? setIsCalendarOpen(true) : handleCategorySwitch('total')}
                            onMouseEnter={handleTotalMouseEnter}
                            onMouseLeave={handleTotalMouseLeave}
                            title={currentUICategory === 'dateRange' ? 'Click to change date range' : undefined}
                        >
                            {currentUICategory === 'dateRange' ? (
                                <>
                                    <svg className="total-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                        <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Range
                                    <svg className="total-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </>
                            ) : (
                                <>
                                    Total
                                    <svg className="total-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <TotalDropdown
                    anchorRef={totalBtnRef}
                    isOpen={isTotalDropdownOpen}
                    isDateRangeActive={currentUICategory === 'dateRange'}
                    onClose={handleTotalMouseLeave}
                    onKeepOpen={handleTotalMouseEnter}
                    onSelectTotal={() => { handleCategorySwitch('total'); setIsTotalDropdownOpen(false); }}
                    onSelectDateRange={() => { switchToDateRange(); setIsTotalDropdownOpen(false); }}
                />

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
                                {' '}&nbsp;of {totalPages}
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
                                        <img src={navigator.onLine
                                            ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                                            : '/icons/default.png'}
                                            alt={domain}
                                            className="site-favicon"
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                if (!navigator.onLine || img.src.endsWith('/icons/default.png')) {
                                                    return;
                                                }
                                                if (img.src.includes('google.com')) {
                                                    img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
                                                } else if (img.src.includes('duckduckgo.com')) {
                                                    img.src = `https://${domain}/favicon.ico`;
                                                } else {
                                                    img.src = '/icons/default.png';
                                                }
                                            }} />
                                        <span className="site-name">{domain.replace(/^www\./, "")}</span>
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