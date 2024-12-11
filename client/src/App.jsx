import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css"; // Custom CSS for styling
import "./Tanker_Complete 3/Fonts/WEB/css/tanker.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi"; // Import the required wagmi functions

import { waitForTransactionReceipt } from "wagmi/actions";
import { formatUnits, parseEther } from "ethers";
import { LENDINGANDBORROWINGABI, LENDINGANDBORROWING } from "./abi/config";
import { writeContract } from "viem/actions";

const contractAddress = LENDINGANDBORROWING;
const abi = LENDINGANDBORROWINGABI;

function App() {
  // User's wallet address
  const [section, setSection] = useState("lender"); // "lender" or "borrower"
  const [form, setForm] = useState({
    amount: "",
    loanPeriod: "",
    loanIndex: "",
    lockTime: "",
    lendingIndex: "",
  });
  const [feedback, setFeedback] = useState("");
  const [lendingHistory, setLendingHistory] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repaymentAmount, setRepaymentAmount] = useState(null);
  const [borrowerAddress, setBorrowerAddress] = useState("");

  const { address } = useAccount();

  const { writeContractAsync } = useWriteContract();

  //lending history
  const {
    data: lendingData,
    isLoading: isLendingLoading,
    isError: isLendingError,
  } = useReadContract({
    address: LENDINGANDBORROWING,
    abi: LENDINGANDBORROWINGABI,
    functionName: "getLendingHistory",
    args: [address],
  });

  //borrowing history
  const {
    data: borrowingData,
    isLoading: isBorrowingLoading,
    isError: isBorrowingError,
  } = useReadContract({
    address: LENDINGANDBORROWING,
    abi: LENDINGANDBORROWINGABI,
    functionName: "getLoanHistory",
    args: [address],
  });

  //fetch repayment
  const {
    data: repaymentData,
    isLoading,
    isError,
  } = useReadContract({
    address: LENDINGANDBORROWING, // Replace with your contract address
    abi: LENDINGANDBORROWINGABI,
    functionName: "calculateRepaymentAmount",
    args: [address, form.loanIndex],
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name == "amount") {
      if (value === "" || /^(\d+(\.\d{0,18})?|0\.\d{0,18})$/.test(value)) {
        setForm({ ...form, [name]: value });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Lender Functions
  const deposit = async () => {
    const amount = parseFloat(form.amount);

    if (!form.amount || !form.lockTime)
      return setFeedback("Please fill in all fields.");

    if (isNaN(amount) || amount <= 0) {
      alert("The value should be greater than 0.");
      return;
    }

    const formattedAmount = form.amount
      ? (parseFloat(form.amount) * 10 ** 18).toString()
      : null;

    await toast.promise(
      (async () => {
        // Call the deposit function on the contract
        const depositHash = await writeContractAsync({
          abi: LENDINGANDBORROWINGABI,
          functionName: "deposit",
          address: LENDINGANDBORROWING,
          args: [form.lockTime],
          value: formattedAmount, // Sending native XFI tokens
        });
        console.log(formattedAmount);
      })(),
      {
        loading: "Processing your deposit...",
        success: "Deposit successful!",
        error: "Error processing deposit.",
      }
    );
  };

  const withdraw = async () => {
    const { lendingIndex } = form;
    if (!lendingIndex) return setFeedback("Please provide a lending index.");

    try {
      await toast.promise(
        (async () => {
          // Call the withdraw function on the contract
          const depositHash = await writeContractAsync({
            abi: LENDINGANDBORROWINGABI,
            functionName: "withdraw",
            address: LENDINGANDBORROWING,
            args: [lendingIndex],
          });
          // Wait for the transaction to be mined
          await depositHash.wait(); // Ensure the transaction is confirmed
        })(),
        {
          loading: "Processing your Withdraw...",
          success: "Withdraw successful!",
          error: "Error processing Withdraw.",
        }
      );
    } catch (err) {
      // If there is an error, catch it and set the feedback
      setFeedback(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchLendingHistory = async () => {
      if (isLendingError) {
        console.error("Error fetching lending history:", isLendingError);
        toast.error("Failed to fetch lending history.");
        setLoading(false);
      } else if (lendingData) {
        console.log("Fetched data:", lendingData); // Log the fetched data
        // Convert BigInt values to numbers/strings for safe handling
        const formattedData = lendingData.map((record) => ({
          amountLent: record.amountLent.toString(), // Convert BigInt to string for easier display
          lockTime: Number(record.lockTime), // Convert BigInt to number
          unlockTime: new Date(
            Number(record.unlockTime) * 1000
          ).toLocaleString(), // Convert timestamp from BigInt to number and format
          claimed: record.claimed ? "Claimed" : "Not Claimed", // Format boolean for display
        }));

        setLendingHistory(formattedData);
        setLoading(false);
        toast.success("Lending history fetched successfully!");
      }
    };

    fetchLendingHistory();
  }, [lendingData, isLendingError]);

  // Borrower Functions
  const borrow = async () => {
    const { amount, loanPeriod } = form;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return setFeedback("Please enter a valid amount.");
    }

    if (isNaN(amount) || amount <= 0) {
      alert("The value should be greater than 0.");
      return;
    }

    if (!loanPeriod) {
      return setFeedback("Please select a loan period.");
    }

    try {
      await toast.promise(
        (async () => {
          // Call the deposit function on the contract
          const depositHash = await writeContractAsync({
            abi: LENDINGANDBORROWINGABI,
            functionName: "borrow",
            address: LENDINGANDBORROWING,
            args: [amount, loanPeriod],
          });
        })(),
        {
          loading: "Processing your borrow...",
          success: "Borrow successful!",
          error: "Error processing Borrow..",
        }
      );
    } catch (err) {
      if (err.code === "INSUFFICIENT_FUNDS") {
        setFeedback("Insufficient liquidity in the contract.");
      } else if (
        err.message.includes(
          "You must repay all previous loans before borrowing again"
        )
      ) {
        setFeedback(
          "You must repay all previous loans before borrowing again."
        );
      } else if (
        err.message.includes("You are blacklisted due to a previous default")
      ) {
        setFeedback("You are blacklisted due to a previous default.");
      } else if (err.message.includes("Loan amount must be greater than 0")) {
        setFeedback("Loan amount must be greater than 0.");
      } else if (err.message.includes("Invalid loan period")) {
        setFeedback(
          "Invalid loan period. Valid periods are 30, 90, or 180 days."
        );
      } else {
        setFeedback(`Error: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    const fetchBorrowHistory = async () => {
      setLoading(true);
      try {
        if (isBorrowingError) {
          console.error("Error fetching Borrow history:", isBorrowingError);
          toast.error("Failed to fetch Borrow history.");
          setLoading(false);
          return;
        }

        if (borrowingData) {
          console.log("Fetched data:", borrowingData); // Log the fetched raw data for debugging

          // Convert BigInt values to numbers/strings for safe handling
          const formattedData = borrowingData.map((record) => ({
            amountBorrowed: record.amountBorrowed.toString(), // Convert BigInt to string for display
            dueDate: new Date(Number(record.dueDate) * 1000).toLocaleString(), // Convert timestamp to readable date
            repaid: record.repaid ? "Yes" : "No", // Format boolean for display
            lateFeeAccrued: record.lateFeeAccrued.toString(), // Convert BigInt to string
          }));

          setLoanHistory(formattedData); // Update the state with formatted data
          toast.success("Borrow history fetched successfully!");
        }
      } catch (err) {
        console.error("Error fetching Borrow history:", err);
        toast.error("An error occurred while fetching Borrow history.");
      } finally {
        setLoading(false); // Set loading state to false after fetching is complete
      }
    };

    fetchBorrowHistory();
  }, [borrowingData, isBorrowingError]);

  useEffect(() => {
    if (repaymentData) {
      setRepaymentAmount(repaymentData.toString());
    }
  }, [repaymentData]);

  const fetchRepaymentAmount = () => {
    if (!form.loanIndex) {
      alert("Please provide a valid loan index.");
      return;
    }
  };

  const repayLoan = async () => {
    if (!form.loanIndex) return setFeedback("Please fill in all fields.");

    try {
      await toast.promise(
        (async () => {
          // Call the repay function on the contract
          const depositHash = await writeContractAsync({
            abi: LENDINGANDBORROWINGABI,
            functionName: "repayLoan",
            address: LENDINGANDBORROWING,
            args: [form.loanIndex],
            value: repaymentAmount,
          });
        })(),
        {
          loading: "Processing your repayment...",
          success: "Repayment successful!",
          error: "Error processing Repayment..",
        }
      );
    } catch (err) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  // Recover funds from a defaulted borrower
  const recoverFunds = async () => {
    if (!borrowerAddress) {
      return setFeedback("Please provide a borrower address.");
    }

    try {
      await toast.promise(
        (async () => {
          const recoverHash = await writeContractAsync({
            abi: LENDINGANDBORROWINGABI,
            functionName: "recoverDefaultedFunds",
            address: LENDINGANDBORROWING,
            args: [borrowerAddress],
          });
        })(),
        {
          loading: "Recovering defaulted funds...",
          success: "Funds recovered successfully!",
          error: "Error recovering funds.",
        }
      );
      setFeedback("");
      setBorrowerAddress(""); // Clear input after successful operation
    } catch (err) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  //unbalacklist borrowers
  const unblacklist = async () => {
    if (!borrowerAddress) {
      return setFeedback("Please provide a borrower address.");
    }

    try {
      await toast.promise(
        (async () => {
          const unblacklistHash = await writeContractAsync({
            abi: LENDINGANDBORROWINGABI,
            functionName: "unblacklistBorrower",
            address: LENDINGANDBORROWING,
            args: [borrowerAddress],
          });
        })(),
        {
          loading: "Unblacklisting borrower...",
          success: "Borrower unblacklisted successfully!",
          error: "Error unblacklisting borrower.",
        }
      );
      setFeedback("");
      setBorrowerAddress(""); // Clear input after successful operation
    } catch (err) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const renderSection = () => {
    if (section === "lender") {
      return (
        <div>
          <h2>Lender Section</h2>
          <div>
            <label>Amount (in XFI):</label>
            <input
              type="text"
              name="amount"
              value={form.amount || ""}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label>Lock Time:</label>
            <select name="lockTime" onChange={handleInputChange}>
              <option value="">Select</option>
              <option value="2592000">30 Days</option>
              <option value="7776000">90 Days</option>
              <option value="15552000">180 Days</option>
            </select>
          </div>
          <button onClick={deposit}>Deposit</button>
          <hr />
          <div>
            <label>Lending Index:</label>
            <input
              type="number"
              name="lendingIndex"
              onChange={handleInputChange}
            />
          </div>
          <button onClick={withdraw}>Withdraw</button>
          <hr />
          <button>Lending History</button>
          {lendingHistory.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Amount Lent</th>
                  <th>Lock Time</th>
                  <th>Unlock Time</th>
                  <th>Claim Status</th>
                </tr>
              </thead>
              <tbody>
                {lendingHistory.map((record, index) => {
                  // Assuming lockTime is in seconds from the current block's timestamp.
                  const currentTimestamp = Math.floor(Date.now() / 1000); // Get current timestamp in seconds.
                  const lockTimestamp = currentTimestamp - record.lockTime; // Calculate the actual lock timestamp.
                  const lockTimeDate = new Date(lockTimestamp * 1000); // Convert lock timestamp to milliseconds

                  return (
                    <tr key={index}>
                      <td>{record.amountLent}</td>
                      <td>{lockTimeDate.toLocaleDateString("en-GB")}</td>
                      <td>{record.unlockTime}</td> {/* Unlock time */}
                      <td>{record.claimed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p>No lending history found.</p>
          )}
        </div>
      );
    } else if (section === "borrower") {
      return (
        <div>
          <h2>Borrower Section</h2>
          <div>
            <label>Amount (in XFI):</label>
            <input type="number" name="amount" onChange={handleInputChange} />
          </div>
          <div>
            <label>Loan Period:</label>
            <select name="loanPeriod" onChange={handleInputChange}>
              <option value="">Select</option>
              <option value="2592000">30 Days</option>
              <option value="7776000">90 Days</option>
              <option value="15552000">180 Days</option>
            </select>
          </div>
          <button onClick={borrow}>Request Loan</button>
          <hr />
          <div>
            <label>Loan Index:</label>
            <input
              type="number"
              name="loanIndex"
              onChange={handleInputChange}
            />
          </div>
          <button onClick={repayLoan}>Repay Loan</button>
          <hr />
          <div>
            <button onClick={fetchRepaymentAmount}>
              Calculate Repayment Amount
            </button>
            {repaymentAmount && <p>Repayment Amount: {repaymentAmount} XFI</p>}
          </div>
          <hr />
          <button>Fetch Loan History</button>
          {loanHistory.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Amount Borrowed</th>
                  <th>Due Date</th>
                  <th>Repaid</th>
                  <th>Late Fee Accrued</th>
                </tr>
              </thead>
              <tbody>
                {loanHistory.map((record, index) => (
                  <tr key={index}>
                    <td>{record.amountBorrowed}</td>
                    <td>{record.dueDate}</td>
                    <td>{record.repaid}</td>
                    <td>{record.lateFeeAccrued}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No loan history found.</p>
          )}
        </div>
      );
    } else if (section === "admin") {
      return (
        <div>
          <h2>Admin Section</h2>
          {/* Recover Defaulted Funds */}
          <div>
            <label>Borrower Address:</label>
            <input
              type="text"
              value={borrowerAddress}
              onChange={(e) => setBorrowerAddress(e.target.value)}
            />
          </div>
          <button onClick={recoverFunds}>Recover Defaulted Funds</button>
          <button onClick={unblacklist} style={{ marginTop: "10px" }}>
            Unblacklist Borrower
          </button>
          {feedback && <p>{feedback}</p>}
        </div>
      );
    }
  };

  return (
    <div className="App">
      <header>
        <h1>LendX Protocol</h1>
      </header>
      <nav>
        <button onClick={() => setSection("lender")}>Lender</button>
        <button onClick={() => setSection("borrower")}>Borrower</button>
        <button onClick={() => setSection("admin")}>Admin</button>
        <ConnectButton />
      </nav>
      <main>{renderSection()}</main>
      <footer>
        <p>{feedback}</p>
      </footer>
    </div>
  );
}

export default App;
