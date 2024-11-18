import React from "react";
import * as d3 from "d3";
import "../App.scss";

import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import { createTheme, ThemeProvider, Button, Input, BThemeProviderutton, TableFooter, adaptV4Theme } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWindowMaximize, faWindowMinimize } from '@fortawesome/free-solid-svg-icons'
import { createColumnHelper, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender } from "@tanstack/react-table";

const formatGp = d3.format(".3~s");
const columnHelper = createColumnHelper();
const basicColumns = [
  columnHelper.accessor("icon", {
    header: "",
    cell: info => {
      return (
        <img 
          height={24} 
          style={{marginBottom: "-8px"}}
          src={`data:image/png;base64,${info.getValue()}`} />
      );
    }
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: info => info.getValue()
  }),
  columnHelper.accessor("daily", {
    header: "Price",
    cell: info => formatGp(info.getValue()) 
  }),
  columnHelper.accessor("volume", {
    header: "Volume",
    cell: info => formatGp(info.getValue()) 
  })
];

const expandedColumns = [
  columnHelper.accessor("icon", {
    header: "",
    cell: info => {
      return (
        <img 
          height={24} 
          style={{marginBottom: "-8px"}}
          src={`data:image/png;base64,${info.getValue()}`} />
      );
    }
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: info => info.getValue()
  }),
  columnHelper.accessor("daily", {
    header: "Price",
    cell: info => formatGp(info.getValue()) 
  }),
  columnHelper.accessor("volume", {
    header: "Volume",
    cell: info => formatGp(info.getValue()) 
  }),
  columnHelper.accessor("buy_limit", {
    header: "Buy Limit",
    cell: info => info.getValue()
  }),
  columnHelper.accessor("high_alch", {
    header: "High Alch. Value",
    cell: info => formatGp(info.getValue())
  }),
  columnHelper.accessor("high_alch_profit", {
    header: "High Alch. Profit",
    cell: info => formatGp(info.getValue()) 
  })
];

const RED = "#d66061";

export default function ItemSidebar({ data, activeItemId, setActiveItemId, expanded, setExpanded, height }) {
  const [filteredData, setFilteredData] = React.useState(data);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          primary: {main: RED},
          mode: 'dark',
        },
      }),
    [],
  );

  return (
    <div className="Sidebar">
      <ThemeProvider theme={theme}>
        <div className="Header">
          <img src={'./coins.png'} className="HeaderImage" alt=""/>
          <div className="Logo">OSRS Market Watch</div>
        </div>
        <div className="SearchBarContainer">
          <Input
            type="text"
            className="Searchbar"
            style={{ width: "100%" }}
            placeholder="Search..."
            onKeyDown={(e) => {
              if (e.which === 13 && !e.shiftKey) {
                  setFilteredData(data.filter(item => item.name.toLowerCase().includes(e.target.value.toLowerCase())))
              }
            }}
          >
          </Input>
          <Button onClick={() => setExpanded(!expanded)} className="ExpandButton">
            <FontAwesomeIcon icon={expanded ? faWindowMinimize : faWindowMaximize}/>
          </Button>
        </div>
        <div className="TableContainer">
          <ItemTable
            data={filteredData}
            columns={expanded ? expandedColumns : basicColumns}
            activeItemId={activeItemId}
            setActiveItemId={setActiveItemId} />
        </div>
      </ThemeProvider>
    </div>
  );
}

function ItemTable({data, columns, activeItemId, setActiveItemId}) {
  const tableInstance = useReactTable({
    data: data,
    columns: columns, 
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow className="PriceTableRow">
            {tableInstance.getFlatHeaders().map(header => {
              return (
                <TableCell key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              )
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableInstance.getRowModel().rows.map(row => {
            return (
              <TableRow 
                className={`PriceTableRow ${row.original.id === activeItemId ? "Selected" : ""}`}
                onClick={() => setActiveItemId(row.original.id)}>
                {row.getVisibleCells().map(cell => {
                  return (
                    <TableCell>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
    <div className="Footer">
      <Button onClick={tableInstance.firstPage}>
        First
      </Button>
      <Button onClick={tableInstance.previousPage} disabled={!tableInstance.getCanPreviousPage()}>
        Prev
      </Button>
      <div>
        Page{' '}
        <em>
          {tableInstance.getState().pagination.pageIndex + 1} of {tableInstance.getPageCount()}
        </em>
      </div>
      <Button onClick={tableInstance.nextPage} disabled={!tableInstance.getCanNextPage()}>
        Next
      </Button>
      <Button onClick={tableInstance.lastPage}>
        Last
      </Button>
    </div>
    </>
  )
}