import jsPDF from 'jspdf';

interface AnalysisResult {
  filename: string;
  results: {
    file: string;
    matches: string[];
    preview: string;
  }[];
  totalMatches: number;
}

interface SearchSettings {
  wallets: boolean;
  paypal: boolean;
  customKeywords?: string;
}

export function exportToPDF(results: AnalysisResult[], searchSettings: SearchSettings) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.text('ZIP Files Analysis Report', 20, yPosition);
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
  yPosition += 10;

  // Search settings
  doc.setFontSize(12);
  doc.text('Search Settings:', 20, yPosition);
  yPosition += 7;
  doc.setFontSize(10);
  doc.text(`- Wallet Detection: ${searchSettings.wallets ? 'Enabled' : 'Disabled'}`, 25, yPosition);
  yPosition += 5;
  doc.text(`- PayPal Detection: ${searchSettings.paypal ? 'Enabled' : 'Disabled'}`, 25, yPosition);
  yPosition += 5;
  if (searchSettings.customKeywords) {
    doc.text(`- Custom Keywords: ${searchSettings.customKeywords}`, 25, yPosition);
    yPosition += 5;
  }
  yPosition += 10;

  // Results
  doc.setFontSize(14);
  doc.text('Analysis Results:', 20, yPosition);
  yPosition += 10;

  results.forEach((result) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // File name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`File: ${result.filename}`, 20, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 7;

    doc.setFontSize(10);
    doc.text(`Total Matches: ${result.totalMatches}`, 25, yPosition);
    yPosition += 7;

    // Matches
    result.results.forEach((item) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(10);
      const fileText = `• ${item.file}`;
      const lines = doc.splitTextToSize(fileText, 170);
      lines.forEach((line: string) => {
        doc.text(line, 30, yPosition);
        yPosition += 5;
      });

      // Matches
      const matchesText = `Matches: ${item.matches.join(', ')}`;
      const matchLines = doc.splitTextToSize(matchesText, 165);
      matchLines.forEach((line: string) => {
        doc.text(line, 35, yPosition);
        yPosition += 5;
      });

      // Preview
      const previewText = `Preview: ${item.preview.substring(0, 100)}...`;
      const previewLines = doc.splitTextToSize(previewText, 165);
      previewLines.forEach((line: string) => {
        doc.text(line, 35, yPosition);
        yPosition += 5;
      });

      yPosition += 5;
    });

    yPosition += 10;
  });

  // Save the PDF
  doc.save(`zip-analysis-${Date.now()}.pdf`);
}

export function exportToCSV(results: AnalysisResult[]) {
  const csvContent: string[] = [
    'Filename,File Path,Matches,Preview'
  ];

  results.forEach((result) => {
    result.results.forEach((item) => {
      const row = [
        result.filename,
        item.file,
        item.matches.join('; '),
        `"${item.preview.replace(/"/g, '""')}"`
      ].join(',');
      csvContent.push(row);
    });
  });

  const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `zip-analysis-${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
