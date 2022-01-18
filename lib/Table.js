const colors = require("colors");
const { Config, Control } = require("./Config");
const { length, size } = require("./Utils");

function Table(data, structure, configuration, includeHeaders = true) {
  const config = configuration || new Config(structure);
  const rows = [];

  if (includeHeaders) {
    rows.push(new Header(structure, config, text => text.yellow));
  }

  data.forEach(item => {
    rows.push(new Row(item, structure, config));
  });

  return {
    print: function () {
      return rows.map(row => row.print()).join("\n");
    }
  };
}

function Header(structure, config, customStyle) {
  const headerRowConfig = {
    height: new Control()
  };

  const cells = structure.map(structureItem => {
    let header = structureItem.label;
    if (structureItem.group) {
      header = ` ${header} `;

      const subHeader = new Header(structureItem.group, config[structureItem.key].group).print();
      if (subHeader.trim().length > 0) {
        header += "\n" + subHeader;
      }
    }

    return new Cell({ width: config[structureItem.key].width, height: headerRowConfig.height }, header, text =>
      structureItem.group ? text : ` ${text} `
    ).style(customStyle);
  });

  return {
    print: function () {
      return printRow(cells, headerRowConfig);
    }
  };
}

function Row(item, structure, config) {
  const cells = [];

  const row = {
    config: {
      height: new Control()
    },
    cells: cells
  };

  structure.forEach(structureItem => {
    const cellConfig = {
      width: config[structureItem.key].width,
      height: row.config.height
    };

    if (structureItem.group) {
      const value = item[structureItem.key];
      if (Array.isArray(value)) {
        cells.push(
          new Cell(cellConfig, new Table(value, structureItem.group, config[structureItem.key].group, false).print())
        );
      } else {
        cells.push(new Cell(cellConfig, new Row(value, structureItem.group, config[structureItem.key].group).print()));
      }
    } else {
      cells.push(new Cell(cellConfig, item[structureItem.key], text => ` ${text} `));
    }
  });

  return {
    print: function () {
      return printRow(row.cells, row.config);
    }
  };
}

function Cell(config, data, transformer = text => text) {
  let customStyle = text => text;
  config.width.add(length(data));
  config.height.add(size(data));

  return {
    style: function (style) {
      customStyle = style || (text => text);
      return this;
    },

    print: function () {
      let formattedValue = data;
      if (formattedValue === undefined || formattedValue === null) {
        formattedValue = "";
      } else if (typeof formattedValue === "number") {
        formattedValue = `${formattedValue}`;
        formattedValue = formattedValue.padStart(config.width.value(), " ");
      } else if (Array.isArray(formattedValue)) {
        formattedValue = formattedValue.join("\n");
      }

      const lines = formattedValue.split("\n");

      while (lines.length < config.height.value()) {
        lines.push("");
      }

      return lines
        .map(line => pad(line, config.width.value()))
        .map(line => transformer(line))
        .map(line => customStyle(line));
    }
  };
}

function printRow(cells, config) {
  const cellLines = cells.map(cell => cell.print());

  let text = "";

  for (let i = 0; i < config.height.value(); i++) {
    if (i > 0) text += "\n";
    cellLines.forEach(cell => {
      text += cell[i];
    });
  }

  return text;
}

function pad(value, length) {
  if (value === undefined || value === null) {
    return "".padEnd(length, " ");
  }
  if (typeof value === "number") {
    return `${value}`.padStart(length, " ");
  }
  if (Array.isArray(value)) {
    return value.map(item => pad(item, length));
  }
  return `${value}`.padEnd(length, " ");
}

module.exports = { Table };
