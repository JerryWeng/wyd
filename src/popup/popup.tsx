// css imports
import './css/infoControl.css';
import './css/pieChart.css';
import './css/popup.css';
import './css/stats.css';

// image imports
import SettingsIcon from '../assets/icons/settings.png';

// hook and utility imports
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
        isFirstPage,
        isLastPage
    } = usePagination(sortedSites, 4);

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

            {/* Category Buttons - Now driven by state */}
            <div className="categories">
                <button id="todayBtn" className={currentCategory === 'today' ? 'active' : ''} onClick={() => handleCategorySwitch('today')}>Today</button>
                <button id="totalBtn" className={currentCategory === 'total' ? 'active' : ''} onClick={() => handleCategorySwitch('total')}>Total</button>
            </div>

            {/* Chart - Now a dedicated component */}
            <PieChart data={DataProcessor.processDataForChart(allData)} />

            {/* Controls */}
            <div id="controlContainer">
                <div id="infoControls">
                    <div id="sortControls">
                        <div id="filterBtn" onClick={toggleFilter} title={`Filtering by ${filterBy}`}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 4.6C3 4.03995 3 3.75992 3.10899 3.54601C3.20487 3.35785 3.35785 3.20487 3.54601 3.10899C3.75992 3 4.03995 3 4.6 3H19.4C19.9601 3 20.2401 3 20.454 3.10899C20.6422 3.20487 20.7951 3.35785 20.891 3.54601C21 3.75992 21 4.03995 21 4.6V6.33726C21 6.58185 21 6.70414 20.9724 6.81923C20.9479 6.92127 20.9075 7.01881 20.8526 7.10828C20.7908 7.2092 20.7043 7.29568 20.5314 7.46863L14.4686 13.5314C14.2957 13.7043 14.2092 13.7908 14.1474 13.8917C14.0925 13.9812 14.0521 14.0787 14.0276 14.1808C14 14.2959 14 14.4182 14 14.6627V17L10 21V14.6627C10 14.4182 10 14.2959 9.97237 14.1808C9.94787 14.0787 9.90747 13.9812 9.85264 13.8917C9.7908 13.7908 9.70432 13.7043 9.53137 13.5314L3.46863 7.46863C3.29568 7.29568 3.2092 7.2092 3.14736 7.10828C3.09253 7.01881 3.05213 6.92127 3.02763 6.81923C3 6.70414 3 6.58185 3 6.33726V4.6Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                        </div>
                        <div id="sortBtn" onClick={toggleSortOrder} title={`Sorting ${sortOrder}`}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7.55228 5 8 5.44772 8 6V15.5858L10.2929 13.2929C10.6834 12.9024 11.3166 12.9024 11.7071 13.2929C12.0976 13.6834 12.0976 14.3166 11.7071 14.7071L7.70711 18.7071C7.31658 19.0976 6.68342 19.0976 6.29289 18.7071L2.29289 14.7071C1.90237 14.3166 1.90237 13.6834 2.29289 13.2929C2.68342 12.9024 3.31658 12.9024 3.70711 13.2929L6 15.5858V6C6 5.44772 6.44772 5 7 5ZM16.2929 5.29289C16.6834 4.90237 17.3166 4.90237 17.7071 5.29289L21.7071 9.29289C22.0976 9.68342 22.0976 10.3166 21.7071 10.7071C21.3166 11.0976 20.6834 11.0976 20.2929 10.7071L18 8.41421V18C18 18.5523 17.5523 19 17 19C16.4477 19 16 18.5523 16 18V8.41421L13.7071 10.7071C13.3166 11.0976 12.6834 11.0976 12.2929 10.7071C11.9024 10.3166 11.9024 9.68342 12.2929 9.29289L16.2929 5.29289Z" fill="#0F1729"></path> </g></svg>
                        </div>
                    </div>
                    <div id="paginationControls">
                        <button id="prevPage" className="pageControl" onClick={goToPreviousPage} disabled={isFirstPage}>&lt;</button>
                        <div id="pageNumber">{currentPage} of {totalPages}</div>
                        <button id="nextPage" className="pageControl" onClick={goToNextPage} disabled={isLastPage}>&gt;</button>
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
                        <p className="sort-status">Sorting by {filterBy}{sortOrder === "ascending" ? " (ascending)" : " (descending)"}</p>
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