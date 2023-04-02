import {MouseEvent, Component} from 'react';
import Logo from "./assets/images/logo.svg"
import Download from "./assets/images/icons/download.svg"
import './tooltip.css';
import './modal.scss';
import {Filter, Refresh, SelectedTorrent, Table} from "./components/Table";
import {AddTorrentModal} from "./components/ModalAddTorrent";
import {CheckOpenedFile, RemoveTorrent, SetActive} from "../wailsjs/go/main/App";
import {FiltersMenu} from "./components/FiltersMenu";
import {EventsOn} from "../wailsjs/runtime";
import {FilesTorrentMenu} from "./components/FilesTorrentMenu";
import {CreateTorrentModal} from "./components/ModalCreateTorrent";
import {PeersTorrentMenu} from "./components/PeersTorrentMenu";
import {InfoTorrentMenu} from "./components/InfoTorrentMenu";
import {SettingsModal} from "./components/ModalSettings";

interface State {
    selectedItems:  SelectedTorrent[]
    infoSize: number
    tableFilter: Filter
    showAddTorrentModal: boolean
    showCreateTorrentModal: boolean
    showSettingsModal: boolean

    overallUploadSpeed: string
    overallDownloadSpeed: string
    torrentMenuSelected: number

    openFileHash?: string
}

export class App extends Component<{}, State> {
    constructor(props: any, state: State) {
        super(props, state);

        this.state = {
            selectedItems: [],
            infoSize: 150,
            tableFilter: {
                type: "all",
                search: "",
            },
            showAddTorrentModal: false,
            showCreateTorrentModal: false,
            showSettingsModal: false,
            overallUploadSpeed: "0 Bytes",
            overallDownloadSpeed: "0 Bytes",
            torrentMenuSelected: -1,
        }
    }

    setSelectedTorrentMenu = (n: number) => {
        return () => {
            this.setState((current)=>({...current, torrentMenuSelected: n}))
        }
    }

    hasActiveTorrents = () => {
        let has = false;
        this.state.selectedItems.forEach((si)=> {
            if (si.active) has = true;
        })
        return has;
    }
    hasInactiveTorrents = () => {
        let has = false;
        this.state.selectedItems.forEach((si)=> {
            if (!si.active) has = true;
        })
        return has;
    }

    toggleAddTorrentModal = () => {
        this.setState((current)=>({...current, showAddTorrentModal: !this.state.showAddTorrentModal, openFileHash: undefined}))
    }
    toggleCreateTorrentModal = () => {
        this.setState((current)=>({...current, showCreateTorrentModal: !this.state.showCreateTorrentModal}))
    }
    toggleSettingsModal = () => {
        this.setState((current)=>({...current, showSettingsModal: !this.state.showSettingsModal}))
    }

    componentDidMount() {
        EventsOn("open_torrent", (hash: string) => {
            this.setState((current)=>({...current, showAddTorrentModal: true, openFileHash: hash}))
        })
        CheckOpenedFile().then()

        window.addEventListener('resize', () => {
            let topH = document.getElementsByClassName("top-bar")![0].getBoundingClientRect().height;
            let botH = document.getElementsByClassName("foot-bar")![0].getBoundingClientRect().height;
            let minINF = document.getElementsByClassName("torrent-info")![0].getBoundingClientRect();

            let minH = minINF.height;
            if (minH > window.innerHeight-(topH+botH)) {
                this.setState((current)=>({...current, infoSize: window.innerHeight-(topH+botH)}));
            }
        })

        EventsOn("speed", (data)=> {
            this.setState((current)=>({...current, overallUploadSpeed: data.Upload, overallDownloadSpeed: data.Download}));
        })
    }

    extendInfoEvent = (mouseDownEvent: MouseEvent) =>  {
        const startSize = this.state.infoSize;
        const startPosition = { x: mouseDownEvent.pageX, y: mouseDownEvent.pageY };

        const onMouseMove = (mouseMoveEvent: any) => {
            let topH = document.getElementsByClassName("top-bar")![0].getBoundingClientRect().height;
            let botH = document.getElementsByClassName("foot-bar")![0].getBoundingClientRect().height;

            let sz = startSize + startPosition.y - mouseMoveEvent.pageY;
            if (sz > window.innerHeight-(topH+botH)) {
                sz = window.innerHeight-(topH+botH)
            }

            if (sz < 20) {
                sz = 20
            }
            this.setState((current)=>({...current, infoSize: sz}));
        }
        const onMouseUp = () => {
            document.body.removeEventListener("mousemove", onMouseMove);
        }
        document.body.addEventListener("mousemove", onMouseMove);
        document.body.addEventListener("mouseup", onMouseUp, { once: true });
    }

    render() {
        return (
            <div id="App">
                {this.state.showAddTorrentModal ? <AddTorrentModal openHash={this.state.openFileHash} onExit={this.toggleAddTorrentModal}/> : null}
                {this.state.showCreateTorrentModal ? <CreateTorrentModal onExit={this.toggleCreateTorrentModal}/> : null}
                {this.state.showSettingsModal ? <SettingsModal onExit={this.toggleSettingsModal}/> : null}
                <div className="left-bar">
                    <div className="logo-block">
                        <img className="logo-img" src={Logo} alt=""/>
                        <label className="logo-text">TON Torrent</label>
                    </div>
                    <div className="menu-block">
                        <FiltersMenu onChanged={(v) => {
                            this.setState((current)=>({...current, tableFilter: {
                                    type: v,
                                    search: this.state.tableFilter.search
                                }}));
                        }}/>
                        <div className="actions-menu">
                            <button className="menu-item main" onClick={this.toggleAddTorrentModal}>
                                Add Torrent
                            </button>
                            <button className="menu-item" onClick={this.toggleCreateTorrentModal}>
                                Create Torrent
                            </button>
                            <button className="menu-item" onClick={this.toggleSettingsModal}>
                                Settings
                            </button>
                        </div>
                    </div>
                    <div className="version-block">
                        <div className="ver-info">
                            <span>v1.0.0</span>
                            <div className="updates">Check updates</div>
                        </div>
                    </div>
                </div>
                <div className="right-screen">
                    <div className="top-bar">
                        <div className="top-buttons-container">
                            <button className="top-button start" disabled={!this.hasInactiveTorrents()} onClick={() => {
                                this.state.selectedItems.forEach((t) => {
                                    SetActive(t.hash, true).then(Refresh)
                                })
                            }}/>
                            <button className="top-button stop" disabled={!this.hasActiveTorrents()} onClick={() => {
                                this.state.selectedItems.forEach((t) => {
                                    SetActive(t.hash, false).then(Refresh)
                                })
                            }}/>
                            <button className="top-button remove" onClick={() => {
                                this.state.selectedItems.forEach((t) => {
                                    RemoveTorrent(t.hash, false, false).then(()=>{
                                        Refresh()
                                        this.setState((current) => ({ ...current, selectedItems: []}))
                                    })
                                })
                            }}/>
                        </div>
                        <input type="text" className="search-input" placeholder="Search..." onChange={(e) => {
                            this.setState((current)=>({...current, tableFilter: {
                                    type: this.state.tableFilter.type,
                                    search: e.target.value,
                                }}));
                        }}/>
                    </div>
                    <div className="torrents-table" style={{height: "50%", maxWidth: '100%', overflowX: "auto"}}>
                        <Table filter={this.state.tableFilter} onSelect={(sl) => {
                            let menu = this.state.torrentMenuSelected;
                            if (menu == -1 && sl.length > 0) {
                                menu = 0;
                            } else if (sl.length == 0) {
                                menu = -1;
                            }

                            this.setState((current) => ({ ...current, selectedItems: sl, torrentMenuSelected: menu }))
                        }}/>
                    </div>
                    { this.state.selectedItems.length >0 ? <div className="torrent-info" style={{minHeight: this.state.infoSize + "px",maxHeight: this.state.infoSize + "px"}}>
                        <div className="torrent-menu">
                            <button disabled={this.state.torrentMenuSelected == 0 || this.state.torrentMenuSelected == -1} onClick={this.setSelectedTorrentMenu(0)}>Info</button>
                            <button disabled={this.state.torrentMenuSelected == 1 || this.state.torrentMenuSelected == -1} onClick={this.setSelectedTorrentMenu(1)}>Files</button>
                            <button disabled={this.state.torrentMenuSelected == 2 || this.state.torrentMenuSelected == -1} onClick={this.setSelectedTorrentMenu(2)}>Peers</button>
                            <div onMouseDown={this.extendInfoEvent} className="size-scroller"></div>
                        </div>
                        <div className="torrent-body">
                            {this.state.torrentMenuSelected == 0 ? <InfoTorrentMenu torrent={this.state.selectedItems[0].hash}/> : ""}
                            {this.state.torrentMenuSelected == 1 ? <FilesTorrentMenu torrent={this.state.selectedItems[0].hash}/> : ""}
                            {this.state.torrentMenuSelected == 2 ? <PeersTorrentMenu torrent={this.state.selectedItems[0].hash}/> : ""}
                        </div>
                    </div> : ""}
                    <div className="foot-bar">
                        <div className="speed">
                            <span><img src={Download} alt=""/>{this.state.overallDownloadSpeed}</span>
                            <span><img className="upload" src={Download} alt=""/>{this.state.overallUploadSpeed}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default App
