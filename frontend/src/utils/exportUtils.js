export const exportToExcel = (rankingsData, title = 'Leaderboard') => {
  if (!rankingsData || rankingsData.length === 0) {
    alert('No data available to export.');
    return;
  }

  const headers = ['Rank', 'Team / Group Name', 'Participant Name', 'Total Score', 'Problems Solved', 'Time per Problem', 'Total Time Taken', 'Status'];
  const rows = rankingsData.map((r, idx) => {
    let probTimesStr = r.problemTimesFormatted || r.timeTakenFormatted || 'N/A';
    if (r.problemTimes && Array.isArray(r.problemTimes) && r.problemTimes.length > 0) {
      probTimesStr = r.problemTimes.map(pt => `${pt.title || 'P'}: ${pt.formatted || (pt.seconds ? pt.seconds + 's' : 'N/A')}`).join(' | ');
    }

    return [
      r.rank || idx + 1,
      `"${(r.teamName || r.name || r.userName || 'Team').replace(/"/g, '""')}"`,
      `"${(r.name || r.userName || 'Student').replace(/"/g, '""')}"`,
      r.isDisqualified ? 0 : (r.score !== undefined ? r.score : (r.points !== undefined ? r.points : 0)),
      r.solvedCount !== undefined ? r.solvedCount : (r.solvedQuestionsCount !== undefined ? r.solvedQuestionsCount : 0),
      `"${probTimesStr.replace(/"/g, '""')}"`,
      `"${(r.totalTimeFormatted || r.timeTakenFormatted || 'N/A').replace(/"/g, '""')}"`,
      r.isDisqualified ? 'DISQUALIFIED' : 'ACTIVE'
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (rankingsData, title = 'Leaderboard') => {
  if (!rankingsData || rankingsData.length === 0) {
    alert('No data available to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF export.');
    return;
  }

  const rowsHtml = rankingsData.map((r, idx) => {
    let probTimesStr = r.problemTimesFormatted || r.timeTakenFormatted || 'N/A';
    if (r.problemTimes && Array.isArray(r.problemTimes) && r.problemTimes.length > 0) {
      probTimesStr = r.problemTimes.map(pt => `${pt.title || 'P'}: ${pt.formatted || (pt.seconds ? pt.seconds + 's' : 'N/A')}`).join(' | ');
    }

    return `
    <tr style="background: ${r.isDisqualified ? '#fff0f0' : (idx % 2 === 0 ? '#fafafa' : '#ffffff')};">
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; text-align: center; font-weight: bold; font-family: monospace;">#${r.rank || idx + 1}</td>
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; font-weight: 700;">${r.teamName || r.name || r.userName || 'Team'}</td>
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; font-weight: 600;">${r.name || r.userName || 'Student'}</td>
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; text-align: right; font-weight: bold; color: #2E5EFF; font-family: monospace;">${r.isDisqualified ? 0 : (r.score !== undefined ? r.score : (r.points || 0))} pts</td>
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; text-align: center; font-weight: 600;">${r.solvedCount !== undefined ? r.solvedCount : (r.solvedQuestionsCount || 0)}</td>
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; font-size: 11px;">${probTimesStr}</td>
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; text-align: center; font-family: monospace; font-weight: bold;">${r.totalTimeFormatted || r.timeTakenFormatted || 'N/A'}</td>
      <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; text-align: center;">${r.isDisqualified ? '<span style="color: #ff5252; font-weight: bold; background: #ffe0e0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">DISQUALIFIED</span>' : '<span style="color: #2e7d32; font-weight: bold; background: #e8f5e9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">PASSED</span>'}</td>
    </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Official Leaderboard Report</title>
        <style>
          body { font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1A1D23; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2E5EFF; padding-bottom: 16px; margin-bottom: 24px; }
          .brand { font-size: 20px; font-weight: 800; color: #2E5EFF; text-transform: uppercase; letter-spacing: 0.5px; }
          .title { font-size: 18px; font-weight: 700; color: #1A1D23; margin-top: 4px; }
          .meta { font-size: 12px; color: #666; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th { background: #F7F7F5; padding: 10px 8px; border-bottom: 2px solid #E5E4E0; text-align: left; font-size: 11px; text-transform: uppercase; color: #555; }
          .footer { margin-top: 36px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #E5E4E0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">CodeArena Platform</div>
            <div class="title">${title} — Leaderboard Report</div>
          </div>
          <div class="meta" style="text-align: right;">
            <strong>Generated Date:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Exported By:</strong> Platform Administrator<br/>
            <strong>Total Participants:</strong> ${rankingsData.length}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">Rank</th>
              <th>Team / Group Name</th>
              <th>Participant Name</th>
              <th style="text-align: right;">Total Score</th>
              <th style="text-align: center;">Solved</th>
              <th>Time per Problem</th>
              <th style="text-align: center;">Total Time Taken</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Confidential • CodeArena Competitive Coding Platform Leaderboard Audit Document
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

export const exportProctoringToExcel = (proctoringData, title = 'Proctoring Report') => {
  if (!proctoringData || proctoringData.length === 0) {
    alert('No proctoring data available to export.');
    return;
  }

  const headers = ['Team / Group Name', 'Participant Name', 'Email', 'Contest Title', 'Tab Blur Count', 'Max Allowed Blurs', 'Severity Level', 'Disqualified', 'Violation Notes'];
  const rows = proctoringData.map(p => [
    `"${(p.teamName || p.name || p.userName || 'Team').replace(/"/g, '""')}"`,
    `"${(p.name || p.userName || 'Candidate').replace(/"/g, '""')}"`,
    `"${(p.email || 'N/A').replace(/"/g, '""')}"`,
    `"${(p.contestTitle || title).replace(/"/g, '""')}"`,
    p.tabBlurCount || p.blurs || 0,
    p.maxAllowedBlurs || 3,
    `"${p.severityLabel || (p.isDisqualified ? 'DISQUALIFIED' : ((p.tabBlurCount || 0) > 0 ? 'WARNING' : 'NORMAL'))}"`,
    p.isDisqualified ? 'YES' : 'NO',
    `"${(p.disqualificationReason || (p.tabBlurCount > 0 ? `${p.tabBlurCount} tab switch events recorded` : 'Clean focus')).replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Proctoring_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportProctoringToPDF = (proctoringData, title = 'Proctoring Report') => {
  if (!proctoringData || proctoringData.length === 0) {
    alert('No proctoring data available to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF export.');
    return;
  }

  const rowsHtml = proctoringData.map((p, idx) => {
    const blurs = p.tabBlurCount || p.blurs || 0;
    const maxBlurs = p.maxAllowedBlurs || 3;
    const isDisq = p.isDisqualified || blurs >= maxBlurs;
    const severity = isDisq ? 'DISQUALIFIED' : (blurs > 0 ? 'WARNING' : 'NORMAL');
    const badgeBg = isDisq ? '#ffe0e0' : (blurs > 0 ? '#fff8e1' : '#e8f5e9');
    const badgeColor = isDisq ? '#dc2626' : (blurs > 0 ? '#d97706' : '#15803d');

    return `
      <tr style="background: ${isDisq ? '#fff0f0' : (idx % 2 === 0 ? '#fafafa' : '#ffffff')};">
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; font-weight: 700;">${p.teamName || p.name || p.userName || 'Team'}</td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; font-weight: 600;">${p.name || p.userName || 'Candidate'}</td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; color: #555;">${p.email || 'N/A'}</td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; font-weight: 500;">${p.contestTitle || title}</td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; text-align: center; font-weight: bold; color: ${blurs > 0 ? '#dc2626' : '#1a1d23'};">${blurs} / ${maxBlurs}</td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; text-align: center;">
          <span style="color: ${badgeColor}; font-weight: bold; background: ${badgeBg}; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${severity}</span>
        </td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e4e0; font-size: 11px; color: #666;">
          ${p.disqualificationReason || (blurs > 0 ? `${blurs} tab blur focus loss events recorded` : 'No violations detected')}
        </td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Official Live Proctoring & Security Audit Report</title>
        <style>
          body { font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1A1D23; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #DC2626; padding-bottom: 16px; margin-bottom: 24px; }
          .brand { font-size: 20px; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 0.5px; }
          .title { font-size: 18px; font-weight: 700; color: #1A1D23; margin-top: 4px; }
          .meta { font-size: 12px; color: #666; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th { background: #F7F7F5; padding: 10px 8px; border-bottom: 2px solid #E5E4E0; text-align: left; font-size: 11px; text-transform: uppercase; color: #555; }
          .footer { margin-top: 36px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #E5E4E0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">CodeArena Security Hub</div>
            <div class="title">${title} — Live Proctoring Audit Report</div>
          </div>
          <div class="meta" style="text-align: right;">
            <strong>Generated Date:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Exported By:</strong> Platform Administrator<br/>
            <strong>Total Candidates Monitored:</strong> ${proctoringData.length}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Team / Group Name</th>
              <th>Participant Name</th>
              <th>Email</th>
              <th>Contest Title</th>
              <th style="text-align: center;">Blur Count / Max</th>
              <th style="text-align: center;">Severity Level</th>
              <th>Violation Details</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Confidential • CodeArena Anti-Cheat Security Audit & Proctoring Official Document
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};
