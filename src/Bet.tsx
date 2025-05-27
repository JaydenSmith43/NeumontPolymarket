import React, { useState } from "react";

export interface BetProps {
  headline: string;
}

export default function Bet(props: BetProps) {
  const [votes, setVotes] = useState({ yes: 20, no: 70 });

  const handleVote = (type) => {
    const total = votes.yes + votes.no;
    const updatedVotes = {
      ...votes,
      [type]: votes[type] + 1,
    };
    const updatedTotal = updatedVotes.yes + updatedVotes.no;
    setVotes({
      yes: Math.round((updatedVotes.yes / updatedTotal) * 100),
      no: Math.round((updatedVotes.no / updatedTotal) * 100),
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{props.headline}</h2>
      <div style={styles.optionContainer}>
        <div style={styles.label}>Yes</div>
        <div style={styles.barBackground}>
          <div
            style={{
              ...styles.barFill,
              width: `${votes.yes}%`,
              backgroundColor: "#c96",
            }}
          />
        </div>
        <div style={styles.percent}>{votes.yes}%</div>
      </div>
      <div style={styles.optionContainer}>
        <div style={styles.label}>No</div>
        <div style={styles.barBackground}>
          <div
            style={{
              ...styles.barFill,
              width: `${votes.no}%`,
              backgroundColor: "#963",
            }}
          />
        </div>
        <div style={styles.percent}>{votes.no}%</div>
      </div>
      <div style={styles.buttonRow}>
        <button style={styles.button} onClick={() => handleVote("yes")}>
          Yes
        </button>
        <button style={styles.button} onClick={() => handleVote("no")}>
          No
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: 400,
    border: "2px solid #a66",
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#f8eacc",
    fontFamily: "monospace",
    boxShadow: "2px 2px 6px #ccc",
  },
  title: {
    marginBottom: 24,
    color: "#643",
  },
  optionContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    width: 40,
    fontWeight: "bold",
  },
  barBackground: {
    flexGrow: 1,
    height: 14,
    backgroundColor: "#eee",
    margin: "0 8px",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
  },
  percent: {
    width: 40,
    textAlign: "right",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-around",
    marginTop: 20,
  },
  button: {
    padding: "10px 20px",
    fontSize: 18,
    borderRadius: 8,
    border: "2px solid #a66",
    backgroundColor: "#fff8e1",
    cursor: "pointer",
  },
};
