import { useEffect, useState } from "react";
import { ethers, parseEther, formatEther, BrowserProvider } from "ethers";

const contractAddress = "0x3D6de8B870E5725B30bfBf86A918907b85905676";

const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getParticipantsCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "manager",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "participants",
    "outputs": [
      {
        "internalType": "address payable",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "random",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "selectWinner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];

export default function App() {
  const [currentAccount, setCurrentAccount] = useState("");
  const [manager, setManager] = useState("");
  const [balance, setBalance] = useState("");
  const [participants, setParticipants] = useState([]);
  const [entryLoading, setEntryLoading] = useState(false);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [winner, setWinner] = useState({ index: null, address: "" });

  const isManager = currentAccount.toLowerCase() === manager.toLowerCase();

  const contract = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, contractABI, signer);
  };

  const connectWallet = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setCurrentAccount(accounts[0]);
    getManager();
  };

  const getManager = async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const readOnlyContract = new ethers.Contract(contractAddress, contractABI, provider);
      const mgr = await readOnlyContract.manager();
      setManager(mgr);
    } catch (err) {
      console.error("Failed to fetch manager:", err);
    }
  };

  const getData = async () => {
    try {
      const lottery = await contract();
      const bal = await lottery.getBalance();
      const count = await lottery.getParticipantsCount();

      const all = [];
      for (let i = 0; i < count; i++) {
        const p = await lottery.participants(i);
        all.push(p);
      }

      setBalance(formatEther(bal));
      setParticipants(all);
    } catch (error) {
      console.error("Error in getData:", error);
    }
  };

  const enter = async () => {
    try {
      if (!currentAccount) return alert("Connect wallet first!");

      setEntryLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: contractAddress,
        value: parseEther("0.000002")
      });

      await tx.wait();
      await getData();
    } catch (error) {
      console.error("Error while entering lottery:", error);
      alert("Transaction failed. See console for details.");
    } finally {
      setEntryLoading(false);
    }
  };

  const pickWinner = async () => {
    try {
      setWinnerLoading(true);
      const lottery = await contract();
      const tx = await lottery.selectWinner();
      await tx.wait();

      const winnerIndex = Math.floor(Math.random() * participants.length);
      const winnerAddress = participants[winnerIndex] || "";
      setWinner({ index: winnerIndex + 1, address: winnerAddress });

      await getData();
    } catch (error) {
      console.error("Error selecting winner:", error);
      alert("Failed to pick winner. See console for details.");
    } finally {
      setWinnerLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
      window.ethereum.on("accountsChanged", () => window.location.reload());
    }
  }, []);

  useEffect(() => {
    if (currentAccount) getData();
  }, [currentAccount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex justify-center items-start p-4 overflow-x-hidden">
      <div className="w-full max-w-4xl glass p-6 rounded-2xl shadow-2xl space-y-6 backdrop-blur-md bg-white/10 border border-white/20">
        <h1 className="text-3xl text-center font-bold text-white drop-shadow-lg">💰 Lottery DApp</h1>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <h2 className="text-xl font-semibold text-cyan-300 mb-2">📊 Contract Stats</h2>
          <p><b className="text-gray-300">Connected:</b> <span className="text-sm">{currentAccount}</span></p>
          <p><b className="text-gray-300">Manager:</b> <span className="text-sm break-all">{manager || "Loading..."}</span></p>
          <p><b className="text-gray-300">Contract Balance:</b> {balance} ETH</p>
          <p><b className="text-gray-300">Participants:</b> {participants.length}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <h2 className="text-xl font-semibold text-emerald-300 mb-2">💸 Participate in Lottery</h2>
          <button
            onClick={enter}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold shadow-md transition"
            disabled={entryLoading}
          >
            {entryLoading ? "Processing..." : "Enter (0.000002 ETH)"}
          </button>
        </div>

        {isManager && (
          <>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <h2 className="text-xl font-semibold text-yellow-300 mb-2">👥 Participants</h2>
              {participants.length > 0 ? (
                <ul className="list-disc ml-6 text-sm text-white/80">
                  {participants.map((addr, i) => (
                    <li key={i}>Participant {i + 1}: {addr}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm">No participants yet.</p>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <h2 className="text-xl font-semibold text-pink-300 mb-2">🏆 Pick Winner</h2>
              <button
                onClick={pickWinner}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md transition"
                disabled={winnerLoading}
              >
                {winnerLoading ? "Selecting Winner..." : "Pick Winner"}
              </button>
              {winner.address && (
                <p className="mt-4 text-white/80 text-sm">🎉 Winner: Participant {winner.index}: {winner.address}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
