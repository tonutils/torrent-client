import React, {Component} from 'react';
import {
    AddTorrentByHash,
    AddTorrentByMeta,
    CheckHeader,
    GetFiles,
    RemoveTorrent,
    StartDownload
} from "../../wailsjs/go/main/App";
import {Refresh} from "./Table";
import {baseModal} from "./Modal";

interface State {
    selectFilesStage: boolean
    fieldHash?: string
    fieldMeta?: ArrayBuffer
    err: string

    canContinue: boolean
    hash?: string
    files: any[]
}

interface AddTorrentModalProps {
    onExit: () => void
    openHash?: string
}

export class AddTorrentModal extends Component<AddTorrentModalProps, State> {
    constructor(props: AddTorrentModalProps, state: State) {
        super(props, state);

        this.state = {
            selectFilesStage: this.props.openHash ? true : false,
            hash: this.props.openHash,
            err: "",
            files: [],
            canContinue: this.props.openHash ? true : false,
        }
    }
    inter?: number

    componentDidMount() {
        if (this.props.openHash) {
            this.startCheckFiles(this.props.openHash);
        }
    }

    cancel = () => {
        if (this.state.hash) {
            RemoveTorrent(this.state.hash, true, true).then(Refresh)
        }
        this.props.onExit()
    }

    startCheckFiles = (hash: string) => {
        // check header availability every 100 ms, and load files list when we get it
        this.inter = setInterval(() => {
            CheckHeader(hash).then(has => {
                if (has) {
                    GetFiles(hash).then((tree) => {
                        clearInterval(this.inter)
                        this.setState((current) => ({...current, files: tree, canContinue: true}))
                    })
                }
            })
        }, 100)
    }

    next = () => {
        if (!this.state.selectFilesStage) {
            let process = (hash: string, err: string) => {
                if (err == "") {
                    this.setState((current) => ({...current, hash, selectFilesStage: true}))
                    this.startCheckFiles(hash);
                    return
                }
                this.setState((current) => ({...current, err, canContinue: true}))
            }

            if (this.state.fieldMeta) {
                // to base64
                const meta = btoa(String.fromCharCode(...new Uint8Array(this.state.fieldMeta)));
                AddTorrentByMeta(meta).then((ti: any) => {
                    process(ti.Hash, ti.Err);
                })
            } else if (this.state.fieldHash) {
                let hash = this.state.fieldHash;
                AddTorrentByHash(hash).then((err) => {
                    process(hash, err);
                })
            }
            this.setState((current) => ({ ...current, canContinue: false }))
        } else {
            let toDownload: string[] = [];
            for (let file of document.getElementsByClassName("file-to-download")) {
                if ((file as HTMLInputElement).checked) {
                    toDownload.push(file.id.slice("file_".length))
                }
            }

            if (toDownload.length > 0) {
                StartDownload(this.state.hash!, toDownload).then()
                this.props.onExit()
            } else {
                this.cancel()
            }
        }
    }

    componentWillUnmount() {
        if (this.inter)
            clearInterval(this.inter)
    }

    checkAndSet = (id: string) => {
        console.log("ID "+id);
        let numChecked = 0;
        let numNotChecked = 0;
        let dep = document.getElementById("dir_"+id)!;
        for (const el of dep.getElementsByClassName("checkbox-file")) {
            (el.children.item(1) as HTMLInputElement)!.checked ? numChecked++ : numNotChecked++;
        }

        let lab = document.getElementById("lab_"+id)!;
        if (numChecked > 0 && numNotChecked == 0) {
            (lab.children.item(1) as HTMLInputElement)!.checked = true;
        } else if (numChecked == 0 && numNotChecked > 0) {
            (lab.children.item(1) as HTMLInputElement)!.checked = false;
        } else {
            (lab.children.item(1) as HTMLInputElement)!.checked = true;
        }

        let dir = lab.parentElement!;
        if (dir.classList.contains("dir-space")) {
            this.checkAndSet(dir.id.slice(4));
        }
    }

    renderFiles(files: any[]) {
        let items: JSX.Element[] = []
        for (const file of files) {
            if (file.Child == null) {
                items.push(<label className="checkbox-file">{file.Name} <span className="size">[{file.Size}]</span>
                    <input id={"file_"+file.Path} type="checkbox" className="file-to-download" defaultChecked={true} onInput={(e) => {
                        let dir = e.currentTarget.parentElement!.parentElement!;
                        if (dir.classList.contains("dir-space")) {
                            this.checkAndSet(dir.id.slice(4))
                        }
                    }}/>
                    <span className="checkmark"></span>
                </label>)
            } else {
                let id = "dir_"+file.Path;
                let idLabel = "lab_"+file.Path;
                items.push(<label id={idLabel} className="checkbox-file folder">{file.Name} <span className="size">[{file.Size}]</span>
                    <input type="checkbox" defaultChecked={true} onInput={(e)=> {
                        let dep = document.getElementById(id)!;
                        for (const el of dep.getElementsByClassName("checkbox-file")) {
                            (el.children.item(1) as HTMLInputElement)!.checked = e.currentTarget.checked
                        }

                        let dir = e.currentTarget.parentElement!.parentElement!;
                        if (dir.classList.contains("dir-space")) {
                            this.checkAndSet(dir.id.slice(4))
                        }
                    }}/>
                    <span className="checkmark"></span>
                    <button onClick={(e) => {
                        let dep = document.getElementById(id)!;
                        if (dep.style.display == "none") {
                            dep.style.display = "flex";
                            e.currentTarget.style.transform = "rotate(180deg)";
                        } else {
                            dep.style.display = "none";
                            e.currentTarget.style.transform = "";
                        }
                    }}/>
                </label>)
                items.push(<div style={{display:"none"}} className="dir-space" id={id}>{this.renderFiles(file.Child)}</div>)
            }
        }
        return items;
    }

    render() {
        return baseModal(this.cancel, (
            <>
                <div style={this.state.selectFilesStage ? {} : {display: "none"}} className="add-torrent-block">
                    <div className="files-selector">
                        {this.state.files.length > 0 ? this.renderFiles(this.state.files) :
                            <div className="loader-block"><span className="loader"/><span className="loader-text">Loading torrent information..</span></div>}
                    </div>
                </div>
                <div style={this.state.selectFilesStage ? {display: "none"} : {}} className="add-torrent-block">
                    <span className="title">Bag ID</span>
                    <input id="torrent-hash-field" required={true} placeholder="Insert Bag ID..." onChange={(v) => {
                        this.setState((current) => ({...current, err: this.state.err, fieldMeta: undefined, fieldHash: v.target.value,
                            canContinue: v.target.value.length == 64}));
                        (document.getElementById("file-select") as HTMLInputElement).value = "";
                    }} value={this.state.fieldHash} type="text"/>
                    <span className="error">{this.state.err}</span>
                    <hr className="hr-text" data-content="OR"/>
                    <input id="file-select" type="file" className="file" accept=".tontorrent" required={true} onInput={(e)=> {
                        let reader = new FileReader();
                        let fileInput = e.target as HTMLInputElement;
                        if (fileInput && fileInput.files) {
                            reader.readAsArrayBuffer(fileInput.files[0]);
                            reader.onload = (ev) => {
                                if (ev.type === "load") {
                                    this.setState((current) => ({...current, fieldHash: undefined, fieldMeta: reader.result as ArrayBuffer, canContinue: true}))
                                }
                            }
                        }
                    }}/>
                </div>
                <div className="modal-control">
                    <button className="second-button" onClick={this.cancel}>
                        Cancel
                    </button>
                    <button className="main-button" disabled={!this.state.canContinue} onClick={()=>{this.next()}}>
                        Continue
                    </button>
                </div>
            </>
        ));
    }
}