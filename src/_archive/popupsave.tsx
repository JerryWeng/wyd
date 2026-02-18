// css imports 
import './css/infoControl.css';
import './css/pieChart.css';
import './css/popup.css';
import './css/stats.css';

// image imports
import SettingsIcon from '../assets/icons/settings.png';

import { PopupController } from './old_DOM_controllers/PopupController';


const Popup = () => {
    document.addEventListener("DOMContentLoaded", () => {
        new PopupController();
    });

    return (
        <div className="container">
            {/* Header */}
            <div className="subcontainer">
                <div className="title">
                    <div className="logo"><img src="/icons/icon16.png" alt="Logo" /></div>
                    <div className="logoName">WhatAreYouDoing</div>
                </div>
                <div className="options">
                    <button id="settingsBtn">
                        <img src={SettingsIcon} alt="settings gear" />
                    </button>
                </div>
            </div>

            {/* Category Buttons */}
            <div className="categories">
                <button id="todayBtn">Today</button>
                <button id="totalBtn">Total</button>
            </div>

            {/* Chart */}
            <div id="chart-container">
                <canvas id="pieChart"></canvas>
            </div>

            {/* Controls */}
            <div id="controlContainer">
                <div id="infoControls">
                    <div id="sortControls">
                        <div id="filterBtn">
                            <svg
                                fill="none"
                                height="24"
                                stroke-width="1.5"
                                viewBox="0 0 24 24"
                                width="24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M3.99961 3H19.9997C20.552 3 20.9997 3.44764 20.9997 3.99987L20.9999 5.58569C21 5.85097 20.8946 6.10538 20.707 6.29295L14.2925 12.7071C14.105 12.8946 13.9996 13.149 13.9996 13.4142L13.9996 19.7192C13.9996 20.3698 13.3882 20.8472 12.7571 20.6894L10.7571 20.1894C10.3119 20.0781 9.99961 19.6781 9.99961 19.2192L9.99961 13.4142C9.99961 13.149 9.89425 12.8946 9.70672 12.7071L3.2925 6.29289C3.10496 6.10536 2.99961 5.851 2.99961 5.58579V4C2.99961 3.44772 3.44732 3 3.99961 3Z"
                                    stroke="currentColor"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </div>
                        <div id="sortBtn">
                            <svg
                                fill="none"
                                height="24"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                viewBox="0 0 24 24"
                                width="24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M0 0h24v24H0z" fill="none" stroke="none" />
                                <path d="M3 9l4 -4l4 4m-4 -4v14" />
                                <path d="M21 15l-4 4l-4 -4m4 4v-14" />
                            </svg>
                        </div>
                    </div>
                    <div id="paginationControls">
                        <button id="prevPage" className="pageControl">&lt;</button>
                        <div id="pageNumber">1 of 1</div>
                        <button id="nextPage" className="pageControl">&gt;</button>
                    </div>
                </div>
            </div>

            {/* Info Container */}
            <div id="infoContainer">
            </div>
        </div>
    );
};

export default Popup;