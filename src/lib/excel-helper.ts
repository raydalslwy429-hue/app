/**
 * Al-Marasim Native Excel Workbook Utility
 * Generates and parses real Microsoft Excel Workbooks (SpreadsheetML)
 * with native Right-To-Left (RTL) Arabic layout and custom corporate styling.
 */

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: Array<Record<string, any>>;
}

export interface ExcelWorkbookOptions {
  title?: string;
  sheets: ExcelSheet[];
}

export function generateExcelWorkbookXML(
  sheetNameOrOptions: string | ExcelWorkbookOptions,
  maybeColumns?: ExcelColumn[],
  maybeRows?: Array<Record<string, any>>
): string {
  let title = "مطعم المراسيم - نظام CAPA V2";
  let sheets: ExcelSheet[] = [];

  if (typeof sheetNameOrOptions === "object" && sheetNameOrOptions !== null && "sheets" in sheetNameOrOptions) {
    title = sheetNameOrOptions.title || title;
    sheets = sheetNameOrOptions.sheets;
  } else {
    sheets = [
      {
        name: typeof sheetNameOrOptions === "string" ? sheetNameOrOptions : "بيانات",
        columns: maybeColumns || [],
        rows: maybeRows || [],
      },
    ];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${escapeXML(title)}</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>مطعم المراسيم almaRasim</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" x:CharSet="178" ss:Size="11" ss:Color="#1B1111"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2A1C16"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2A1C16"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2A1C16"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2A1C16"/>
   </Borders>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" x:CharSet="178" ss:Size="11" ss:Color="#1B1111" ss:Bold="1"/>
   <Interior ss:Color="#D49A3D" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowEven">
   <Alignment ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" x:CharSet="178" ss:Size="10" ss:Color="#1E293B"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowOdd">
   <Alignment ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" x:CharSet="178" ss:Size="10" ss:Color="#1E293B"/>
   <Interior ss:Color="#FAF7F4" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Consolas, monospace" ss:Size="10" ss:Color="#0F172A" ss:Bold="1"/>
  </Style>
 </Styles>
`;

  sheets.forEach((sheet) => {
    const cleanSheetName = (sheet.name || "ورقة").replace(/[/\\?*[\]]/g, "_").substring(0, 31);
    xml += ` <Worksheet ss:Name="${escapeXML(cleanSheetName)}">
  <Table ss:DefaultColumnWidth="120" ss:DefaultRowHeight="24">
`;

    // Define column widths
    sheet.columns.forEach((col) => {
      const width = col.width || 130;
      xml += `   <Column ss:AutoFitWidth="1" ss:Width="${width}"/>\n`;
    });

    // Header Row
    xml += `   <Row ss:Height="28" ss:StyleID="HeaderStyle">\n`;
    sheet.columns.forEach((col) => {
      xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXML(col.header)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;

    // Data Rows
    sheet.rows.forEach((row, idx) => {
      const rowStyle = idx % 2 === 0 ? "DataRowEven" : "DataRowOdd";
      xml += `   <Row ss:Height="22" ss:StyleID="${rowStyle}">\n`;
      sheet.columns.forEach((col) => {
        const val = row[col.key];
        const isNumeric = typeof val === "number" || (!isNaN(Number(val)) && val !== "" && typeof val !== "boolean");
        if (val === null || val === undefined) {
          xml += `    <Cell><Data ss:Type="String">-</Data></Cell>\n`;
        } else if (isNumeric && typeof val === "number") {
          xml += `    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${val}</Data></Cell>\n`;
        } else {
          xml += `    <Cell><Data ss:Type="String">${escapeXML(String(val))}</Data></Cell>\n`;
        }
      });
      xml += `   </Row>\n`;
    });

    xml += `  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
   <Selected/>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
`;
  });

  xml += `</Workbook>`;
  return xml;
}

export function downloadExcelFile(arg1: string, arg2?: string) {
  let filename = "export.xls";
  let xmlContent = "";

  if (arg1.includes("<?xml") || arg1.includes("<Workbook")) {
    xmlContent = arg1;
    filename = arg2 || filename;
  } else {
    filename = arg1;
    xmlContent = arg2 || "";
  }

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXML(str: string): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\r\n/g, "&#10;")
    .replace(/[\r\n]/g, "&#10;");
}
