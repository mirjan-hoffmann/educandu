import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import TableDesignerMenu from './table-designer-menu.js';
import DebouncedTextArea from '../../components/debounced-text-area.js';
import {
  changeText,
  createDesignerRows,
  deleteColumn,
  deleteRow,
  DESIGNER_CELL_ACTION,
  DESIGNER_CELL_TYPE,
  insertColumnAfter,
  insertColumnBefore,
  insertRowAfter,
  insertRowBefore
} from './table-utils.js';

const CONTENT_INPUT_DATA_ROLE = 'content-input';

function TableEditor({ rowCount, columnCount, cells, onChange }) {
  const designerRows = useMemo(() => {
    return createDesignerRows({ rowCount, columnCount, cells });
  }, [rowCount, columnCount, cells]);

  const handleDesignerCellTextChange = (cell, newText) => {
    onChange(changeText({ rowCount, columnCount, cells }, cell.rowIndex, cell.columnIndex, newText));
  };

  const handleDesignerCellAction = (action, designerCell) => {
    switch (action) {
      case DESIGNER_CELL_ACTION.insertRowBefore:
        onChange(insertRowBefore({ rowCount, columnCount, cells }, designerCell.rowIndex));
        break;
      case DESIGNER_CELL_ACTION.insertRowAfter:
        onChange(insertRowAfter({ rowCount, columnCount, cells }, designerCell.rowIndex));
        break;
      case DESIGNER_CELL_ACTION.deleteRow:
        onChange(deleteRow({ rowCount, columnCount, cells }, designerCell.rowIndex));
        break;
      case DESIGNER_CELL_ACTION.insertColumnBefore:
        onChange(insertColumnBefore({ rowCount, columnCount, cells }, designerCell.columnIndex));
        break;
      case DESIGNER_CELL_ACTION.insertColumnAfter:
        onChange(insertColumnAfter({ rowCount, columnCount, cells }, designerCell.columnIndex));
        break;
      case DESIGNER_CELL_ACTION.deleteColumn:
        onChange(deleteColumn({ rowCount, columnCount, cells }, designerCell.columnIndex));
        break;
      default:
        throw new Error(`Invalid action: '${action}'`);
    }
  };

  const handleContentCellClick = event => {
    if (event.target === event.currentTarget) {
      const textarea = event.target.querySelector(`[data-role="${CONTENT_INPUT_DATA_ROLE}"]`);
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  };

  const renderRowHeaderCell = designerCell => {
    return (
      <td
        className="TableDesigner-tableCell TableDesigner-tableCell--rowHeader"
        key={designerCell.key}
        >
        <div className="TableDesigner-headerCellMenuContainer">
          <TableDesignerMenu
            canDeleteRow={rowCount > 1}
            canDeleteColumn={columnCount > 1}
            cell={designerCell}
            placement="right"
            onCellAction={handleDesignerCellAction}
            />
        </div>
      </td>
    );
  };

  const renderColumnHeaderCell = designerCell => {
    return (
      <td
        className="TableDesigner-tableCell TableDesigner-tableCell--columnHeader"
        key={designerCell.key}
        >
        <div className="TableDesigner-headerCellMenuContainer">
          <TableDesignerMenu
            canDeleteRow={rowCount > 1}
            canDeleteColumn={columnCount > 1}
            cell={designerCell}
            placement="bottom"
            onCellAction={handleDesignerCellAction}
            />
        </div>
      </td>
    );
  };

  const renderContentCell = designerCell => {
    return (
      <td
        className="TableDesigner-tableCell TableDesigner-tableCell--content"
        key={designerCell.key}
        onClick={handleContentCellClick}
        >
        <DebouncedTextArea
          data-role={CONTENT_INPUT_DATA_ROLE}
          className="TableDesigner-contentInput"
          value={designerCell.text}
          onChange={newText => handleDesignerCellTextChange(designerCell, newText)}
          autoSize
          />
        <div className="TableDesigner-contentCellMenuContainer">
          <TableDesignerMenu
            canDeleteRow={rowCount > 1}
            canDeleteColumn={columnCount > 1}
            cell={designerCell}
            placement="bottom"
            dotType="zooming"
            onCellAction={handleDesignerCellAction}
            />
        </div>
      </td>
    );
  };

  const renderDefaultCell = designerCell => {
    return (
      <td
        className="TableDesigner-tableCell"
        key={designerCell.key}
        />
    );
  };

  const renderDesignerCell = designerCell => {
    switch (designerCell.cellType) {
      case DESIGNER_CELL_TYPE.content:
        return renderContentCell(designerCell);
      case DESIGNER_CELL_TYPE.rowHeader:
        return renderRowHeaderCell(designerCell);
      case DESIGNER_CELL_TYPE.columnHeader:
        return renderColumnHeaderCell(designerCell);
      default:
        return renderDefaultCell(designerCell);
    }
  };

  const renderDesignerRow = designerRow => {
    return (
      <tr key={designerRow.map(designerCell => designerCell.key).join()}>
        {designerRow.map(designerCell => renderDesignerCell(designerCell))}
      </tr>
    );
  };

  return (
    <div className="TableDesigner">
      <table className="TableDesigner-table">
        <tbody>
          {designerRows.map(designerRow => renderDesignerRow(designerRow))}
        </tbody>
      </table>
    </div>
  );
}

TableEditor.propTypes = {
  cells: PropTypes.arrayOf(PropTypes.shape({
    rowIndex: PropTypes.number.isRequired,
    columnIndex: PropTypes.number.isRequired,
    rowSpan: PropTypes.number.isRequired,
    columnSpan: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired
  })).isRequired,
  columnCount: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  rowCount: PropTypes.number.isRequired
};

export default TableEditor;