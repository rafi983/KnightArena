export type BoardTheme = {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  lightSquareHover: string;
  darkSquareHover: string;
  selectedSquare: string;
  lastMoveLight: string;
  lastMoveDark: string;
  coordLight: string;
  coordDark: string;
};

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "green",
    name: "Classic Green",
    lightSquare: "#EEEED2",
    darkSquare: "#769656",
    lightSquareHover: "#F6F6A0",
    darkSquareHover: "#5C8A3C",
    selectedSquare: "#F7F769",
    lastMoveLight: "#F2F282",
    lastMoveDark: "#AAC34E",
    coordLight: "#769656",
    coordDark: "#EEEED2",
  },
  {
    id: "blue",
    name: "Ice Blue",
    lightSquare: "#DEE3E6",
    darkSquare: "#8CA2AD",
    lightSquareHover: "#C8D8E0",
    darkSquareHover: "#6B8A97",
    selectedSquare: "#7FC8E8",
    lastMoveLight: "#C8E0F0",
    lastMoveDark: "#6BA8C0",
    coordLight: "#8CA2AD",
    coordDark: "#DEE3E6",
  },
  {
    id: "brown",
    name: "Wood Brown",
    lightSquare: "#F0D9B5",
    darkSquare: "#B58863",
    lightSquareHover: "#E8C890",
    darkSquareHover: "#9A6F4C",
    selectedSquare: "#F7EC5E",
    lastMoveLight: "#F7D26B",
    lastMoveDark: "#D4A03C",
    coordLight: "#B58863",
    coordDark: "#F0D9B5",
  },
];

export const DEFAULT_THEME = BOARD_THEMES[0];
