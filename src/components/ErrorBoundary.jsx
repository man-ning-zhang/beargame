import React from 'react';
import styled from 'styled-components';
import { palette } from '../theme';

const Fallback = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 70vh;
  padding: 24px;
  text-align: center;
  color: ${palette.cream};

  .emoji {
    font-size: 52px;
  }

  .title {
    font-size: 16px;
    font-weight: 700;
  }

  .hint {
    font-size: 13px;
    line-height: 1.6;
    opacity: 0.78;
    max-width: 320px;
  }

  button {
    margin-top: 6px;
    padding: 9px 18px;
    border: 0;
    border-radius: 999px;
    background: ${palette.coral};
    color: #fffaf4;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
`;

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a trace in the console; the boundary keeps the dark screen away.
    console.error('Caught render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <Fallback role="alert">
          <span className="emoji" aria-hidden="true">
            🐻
          </span>
          <span className="title">小屋打盹了一下</span>
          <span className="hint">
            页面遇到一点小问题，刷新一下就好。如果反复出现，可以重新开一间小屋。
          </span>
          <button type="button" onClick={this.handleReload}>
            刷新小屋
          </button>
        </Fallback>
      );
    }
    return this.props.children;
  }
}
