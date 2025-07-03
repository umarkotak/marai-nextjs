import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const [db, setDb] = useState(null);
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [playingUrl, setPlayingUrl] = useState(null);

  useEffect(() => {
    const openRequest = indexedDB.open("MyDB", 1);

    openRequest.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("items")) {
        db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
      }
    };

    openRequest.onsuccess = (e) => {
      const dbInstance = e.target.result;
      setDb(dbInstance);
      loadAll(dbInstance);
    };

    openRequest.onerror = () => {
      console.error("Error opening IndexedDB");
    };
  }, []);

  const loadAll = (dbInstance) => {
    const tx = dbInstance.transaction("items", "readonly");
    const store = tx.objectStore("items");
    const request = store.getAll();
    request.onsuccess = () => {
      setRows(request.result);
    };
  };

  const addItem = async () => {
    if (!name) return;

    let fileBuffer = null;
    let fileName = null;

    if (file) {
      if (file.type !== "video/mp4") {
        alert("Only MP4 files are allowed");
        return;
      }

      fileBuffer = await file.arrayBuffer();
      fileName = file.name;
    }

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    const data = {
      id: editId || Date.now(),
      name: name,
      file: fileBuffer,
      fileName: fileName,
    };

    if (editId !== null) {
      store.put(data);
    } else {
      store.add(data);
    }

    tx.oncomplete = () => {
      setName("");
      setFile(null);
      setEditId(null);
      loadAll(db);
    };

    tx.onerror = (e) => {
      console.error("Transaction error", e.target.error);
    };
  };

  const deleteItem = (id) => {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    store.delete(id);
    tx.oncomplete = () => {
      loadAll(db);
      if (playingUrl) {
        URL.revokeObjectURL(playingUrl);
        setPlayingUrl(null);
      }
    };
  };

  const startEdit = (item) => {
    setName(item.name);
    setFile(null);
    setEditId(item.id);
  };

  const downloadFile = (item) => {
    if (!item.file) return;
    const blob = new Blob([item.file], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.fileName || "download.mp4";
    a.click();
    URL.revokeObjectURL(url);
  };

  const playVideo = (item) => {
    if (!item.file) return;
    if (playingUrl) {
      URL.revokeObjectURL(playingUrl);
    }
    const blob = new Blob([item.file], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    setPlayingUrl(url);
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-2xl font-bold text-center">IndexedDB + MP4 Upload + Play</h1>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="file"
              accept="video/mp4"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <Button onClick={addItem} className="w-full">
              {editId !== null ? "Update" : "Add"}
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-gray-500">{item.fileName}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => downloadFile(item)}>
                    Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => playVideo(item)}>
                    Play
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {playingUrl && (
            <div className="mt-4">
              <video controls className="w-full rounded-lg" src={playingUrl}></video>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
