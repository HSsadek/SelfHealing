import React from 'react';
import { FileCode2 } from 'lucide-react';

const DomDiffViewer = ({ oldSelector, newSelector }) => {
    if (!oldSelector || !newSelector) return null;

    return (
        <div className="qa-card" style={{ marginTop: '1rem' }}>
            <div className="qa-card-title">
                <FileCode2 size={20} className="accent-color" />
                DOM Diff Inspector
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', border: '1px solid #ef4444' }}>
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>BEFORE (Broken)</div>
                    <code style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        &lt;button class=&quot;<span style={{color: '#f87171', textDecoration: 'line-through'}}>{oldSelector.replace('.', '')}</span>&quot;&gt;<br/>
                        &nbsp;&nbsp;Submit<br/>
                        &lt;/button&gt;
                    </code>
                </div>
                <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', border: '1px solid #10b981' }}>
                    <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '0.5rem' }}>AFTER (Healed)</div>
                    <code style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                         &lt;button class=&quot;<span style={{color: '#34d399', fontWeight: 'bold'}}>{newSelector.replace('.', '')}</span>&quot; data-testid=&quot;submit&quot;&gt;<br/>
                        &nbsp;&nbsp;Submit<br/>
                        &lt;/button&gt;
                    </code>
                </div>
            </div>
        </div>
    );
};

export default DomDiffViewer;
