/*
  backgrid
  http://github.com/wyuenho/backgrid

  Copyright (c) 2013 Jimmy Yuen Ho Wong and contributors
  Licensed under the MIT @license.
*/
describe("A CellEditor", function () {

  it("throws TypeError if a formatter is not given", function () {
    expect(function () {
      new Backgrid.CellEditor({});
    }).toThrow(new TypeError("'formatter' is required"));
  });

  it("throws TypeError if a column is not given", function () {
    expect(function () {
      new Backgrid.CellEditor({
        formatter: {
          fromRaw: function () {},
          toRaw: function () {}
        }
      });
    }).toThrow(new TypeError("'column' is required"));
  });

  it("throws TypeError if a model is not given", function () {
    expect(function () {
      new Backgrid.CellEditor({
        formatter: {
          fromRaw: function () {},
          toRaw: function () {}
        },
        column: {
          name: "name",
          cell: "string"
        }
      });
    }).toThrow(new TypeError("'model' is required"));
  });

  it("calls postRender when model triggers 'backgrid:editing'", function () {
    var postRenderCalled = 0;
    var editor = new (Backgrid.CellEditor.extend({
      postRender: function () {
        postRenderCalled++;
      }
    }))({
      formatter: {
        fromRaw: function () {},
        toRaw: function () {}
      },
      column: {
        name: "name",
        cell: "string"
      },
      model: new Backbone.Model({
        name: "alice"
      })
    });
    editor.render();

    editor.model.trigger("backgrid:editing");
    expect(postRenderCalled).toBe(1);
  });

});

describe("An InputCellEditor", function () {

  var book;
  var editor;
  var backgridEditedTriggerCount;
  var backgridEditedTriggerArgs;
  var backgridErrorTriggerCount;
  var backgridErrorTriggerArgs;

  beforeEach(function () {

    book = new Backbone.Model({
      title: "title"
    });

    editor = new (Backgrid.InputCellEditor.extend({
      remove: jasmine.createSpy("remove")
    }))({
      model: book,
      column: new Backgrid.Column({
        name: "title",
        cell: Backgrid.StringCell
      }),
      formatter: Backgrid.StringCell.prototype.formatter,
      placeholder: "put your text here"
    });

    backgridEditedTriggerCount = 0;
    book.on("backgrid:edited", function () {
      backgridEditedTriggerCount++;
      backgridEditedTriggerArgs = [].slice.call(arguments);
    });

    backgridErrorTriggerCount = 0;
    book.on("backgrid:error", function () {
      backgridErrorTriggerCount++;
      backgridErrorTriggerArgs = [].slice.call(arguments);
    });

    this.addMatchers({
      toBeAnInstanceOf: function (expected) {
        var actual = this.actual;
        var notText = this.isNot ? " not" : "";
        this.message = function () {
          return "Expected " + actual + notText + " to be an instance of " + expected;
        };

        return actual instanceof expected;
      }
    });
  });

  it("renders a text input box with a placeholder and the model value formatted for display", function () {
    editor.render();
    expect(editor.el).toBeAnInstanceOf(HTMLInputElement);
    expect(editor.$el.attr("placeholder")).toBe("put your text here");
    expect(editor.$el.val()).toBe("title");
  });

  it("saves a formatted value in the input box to the model and triggers 'backgrid:edited' from the model when tab is pressed", function () {
    editor.render();
    editor.$el.val("another title");
    var tab = $.Event("keydown", { keyCode: 9 });
    editor.$el.trigger(tab);
    expect(editor.model.get(editor.column.get("name"))).toBe("another title");
    expect(backgridEditedTriggerCount).toBe(1);
    expect(backgridEditedTriggerArgs[0]).toEqual(editor.model);
    expect(backgridEditedTriggerArgs[1]).toEqual(editor.column);
    expect(backgridEditedTriggerArgs[2].moveRight()).toBe(true);
  });

  it("saves a formatted value in the input box to the model and triggers 'backgrid:edited' from the model when enter is pressed", function () {
    editor.render();
    editor.$el.val("another title");
    var enter = $.Event("keydown", { keyCode: 13 });
    editor.$el.trigger(enter);
    expect(editor.model.get(editor.column.get("name"))).toBe("another title");
    expect(backgridEditedTriggerCount).toBe(1);
    expect(backgridEditedTriggerArgs[0]).toEqual(editor.model);
    expect(backgridEditedTriggerArgs[1]).toEqual(editor.column);
    expect(backgridEditedTriggerArgs[2].save()).toBe(true);
  });

  it("triggers 'backgrid:error' from the model when trying to save an invalid value", function () {
    editor.formatter = {
      fromRaw: jasmine.createSpy("fromRaw").andCallFake(function (d) {
        return d;
      }),
      toRaw: jasmine.createSpy("toRaw").andReturn(undefined)
    };
    editor.render();
    editor.$el.val("invalid value");
    var enter = $.Event("keydown", { keyCode: 13 });
    editor.$el.trigger(enter);
    expect(editor.formatter.toRaw.calls.length).toBe(1);
    expect(editor.formatter.toRaw).toHaveBeenCalledWith("invalid value");
    expect(backgridErrorTriggerCount).toBe(1);
    expect(backgridErrorTriggerArgs[0]).toEqual(editor.model);
    expect(backgridErrorTriggerArgs[1]).toEqual(editor.column);
    expect(backgridErrorTriggerArgs[2]).toEqual("invalid value");

    editor.formatter.toRaw.reset();
    editor.$el.blur();
    expect(backgridErrorTriggerCount).toBe(2);
    expect(backgridErrorTriggerArgs[0]).toEqual(editor.model);
    expect(backgridErrorTriggerArgs[1]).toEqual(editor.column);
    expect(backgridErrorTriggerArgs[2]).toEqual("invalid value");
  });

  it("discards changes and triggers 'backgrid:edited' from the model when esc is pressed'", function () {
    editor.render();
    editor.$el.val("new value");
    var esc = $.Event("keydown", { keyCode: 27 });
    editor.$el.trigger(esc);
    expect(backgridEditedTriggerCount).toBe(1);
    expect(backgridEditedTriggerArgs[0]).toEqual(editor.model);
    expect(backgridEditedTriggerArgs[1]).toEqual(editor.column);
    expect(backgridEditedTriggerArgs[2].cancel()).toBe(true);
    expect(editor.model.get(editor.column.get("name"))).toBe("title");
  });

  it("triggers 'backgrid:edited' from the model when value hasn't changed and focus is lost", function () {
    editor.render();
    editor.$el.blur();
    expect(backgridEditedTriggerCount).toBe(1);
    expect(backgridEditedTriggerArgs[0]).toEqual(editor.model);
    expect(backgridEditedTriggerArgs[1]).toEqual(editor.column);
    expect(backgridEditedTriggerArgs[2].passThru()).toBe(true);
    expect(editor.model.get(editor.column.get("name"))).toBe("title");
  });

  it("saves the value if the value is valid when going out of focus", function () {
    editor.render();
    editor.$el.val("another title");
    editor.$el.blur();
    expect(backgridEditedTriggerCount).toBe(1);
    expect(backgridEditedTriggerArgs[0]).toEqual(editor.model);
    expect(backgridEditedTriggerArgs[1]).toEqual(editor.column);
    expect(backgridEditedTriggerArgs[2].passThru()).toBe(true);
    expect(editor.model.get(editor.column.get("name"))).toBe("another title");
  });

});

describe("A Cell", function () {

  var book;
  var column;
  var cell;

  beforeEach(function () {
    book = new Backbone.Model({
      title: "title"
    });

    column = {
      name: "title",
      cell: "string"
    };

    cell = new Backgrid.Cell({
      model: book,
      column: column
    });
  });

  it("throws TypeError if model or cell is not given to the constructor", function () {
    expect(function () {
      new Backgrid.Cell({
        column: column
      });
    }).toThrow(new TypeError("'model' is required"));

    expect(function () {
      new Backgrid.Cell({
        model: book
      });
    }).toThrow(new TypeError("'column' is required"));
  });

  it("throws ReferenceError if a formatter cannot be found", function () {
    expect(function () {
      new (Backgrid.Cell.extend({
        formatter: "nosuchformatter"
      }))({
        column: column,
        model: book
      });
    }).toThrow(new ReferenceError("Class 'NosuchformatterFormatter' not found"));
  });

  it("uses the formatter from the column if one is given", function () {

    var formatter = {
      fromRaw: function (rawValue) {
        return rawValue;
      },
      toRaw: function (formattedValue) {
        return formattedValue;
      }
    };

    column = {
      name: "title",
      cell: "string",
      formatter: formatter
    };

    cell = new Backgrid.Cell({
      model: book,
      column: column
    });

    expect(cell.formatter).toBe(formatter);
  });

  it("renders a td with the model value formatted for display", function () {
    cell.render();
    expect(cell.$el.text()).toBe("title");
  });

  it("goes into edit mode on click", function () {
    cell.render();
    cell.$el.click();
    expect(cell.$el.hasClass("editor")).toBe(true);
  });

  it("goes into edit mode when `enterEditMode` is called", function () {
    cell.render();
    cell.enterEditMode();
    expect(cell.$el.hasClass("editor")).toBe(true);
  });

  it("goes back into display mode when `exitEditMode` is called", function () {
    cell.render();

    cell.$el.click();
    cell.exitEditMode();
    expect(cell.$el.hasClass("editor")).toBe(false);
    expect(cell.$el.text()).toBe("title");
  });

  it("renders error when the editor triggers 'backgrid:error'", function () {

    cell.formatter = {
      fromRaw: function () {},
      toRaw: function () {}
    };

    cell.render();
    cell.$el.click();

    var editor = cell.currentEditor;
    editor.$el.val(undefined);

    var enter = $.Event("keydown", { keyCode: 13 });
    editor.$el.trigger(enter);

    expect(cell.$el.hasClass("error")).toBe(true);
    expect(cell.$el.hasClass("editor")).toBe(true);
  });

  describe("when the model value has changed", function () {
    it("refreshes during display mode", function () {
      cell.render();
      book.set("title", "another title");
      expect(cell.$el.text()).toBe("another title");
    });

    it("does not refresh during display mode if the change was silenced", function () {
      cell.render();
      book.set("title", "another title", {silent: true});
      expect(cell.$el.text()).toBe("title");
    });

    it("does not refresh during edit mode", function () {
      cell.render();
      cell.$el.click();
      book.set("title", "another title");
      expect(cell.$el.find("input[type=text]").val(), "title");
    });
  });

});

describe("A StringCell", function () {

  it("applies a string-cell class to the cell", function () {
    var book = new Backbone.Model({
      title: "<title>"
    });

    var column = {
      name: "title",
      cell: "string"
    };

    var cell = new Backgrid.StringCell({
      model: book,
      column: column
    });

    cell.render();
    expect(cell.$el.hasClass("string-cell")).toBe(true);
  });

});

describe("A UriCell", function () {

  var model;
  var column;
  var cell;

  beforeEach(function () {
    model = new Backbone.Model({
      url: "http://www.example.com"
    });

    column = {
      name: "url",
      cell: "uri"
    };

    cell = new Backgrid.UriCell({
      model: model,
      column: column
    });
  });

  it("applies a uri-cell class to the cell", function () {
    cell.render();
    expect(cell.$el.hasClass("uri-cell")).toBe(true);
  });

  it("renders the model value in an anchor", function () {
    cell.render();
    expect(cell.$el.find("a").attr("href")).toBe("http://www.example.com");
    expect(cell.$el.find("a").text()).toBe("http://www.example.com");
  });

});

describe("An EmailCell", function () {

  var model;
  var column;
  var cell;

  beforeEach(function () {
    model = new Backbone.Model({
      email: "email@host"
    });

    column = {
      name: "email",
      cell: "email"
    };

    cell = new Backgrid.EmailCell({
      model: model,
      column: column
    });
  });

  it("applies a email-cell class to the cell", function () {
    expect(cell.render().$el.hasClass("email-cell")).toBe(true);
  });

  it("renders the model value in a mailto: anchor", function () {
    cell.render();
    expect(cell.$el.find("a").attr("href")).toBe("mailto:email@host");
    expect(cell.$el.find("a").text()).toBe("email@host");
  });

});

describe("A NumberCell", function () {

  it("applies a number-cell class to the cell", function () {
    var cell = new Backgrid.NumberCell({
      model: new Backbone.Model({
        age: 1.1
      }),
      column: {
        name: "age",
        cell: "number"
      }
    });
    cell.render();
    expect(cell.$el.hasClass("number-cell")).toBe(true);
  });

});

describe("An IntegerCell", function () {

  it("applies an integer-cell class to the cell", function () {
    var cell = new Backgrid.IntegerCell({
      model: new Backbone.Model({
        age: 1
      }),
      column: {
        name: "age",
        cell: "integer"
      }
    });
    cell.render();
    expect(cell.$el.hasClass("integer-cell")).toBe(true);
  });

});

describe("A DatetimeCell", function () {

  var model;
  var column;
  var cell;

  beforeEach(function () {

    model = new Backbone.Model({
      datetime: "2000-01-01T00:00:00.000Z"
    });

    column = {
      name: "datetime",
      cell: "datetime"
    };

    cell = new Backgrid.DatetimeCell({
      model: model,
      column: column
    });
  });

  it("applies a datetime-cell class to the cell", function () {
    cell.render();
    expect(cell.$el.hasClass("datetime-cell")).toBe(true);
  });

  it("renders a placeholder for different datetime formats for the editor according to configuration", function () {
    cell = new Backgrid.DatetimeCell({
      model: model,
      column: column
    });
    expect(cell.editor.prototype.attributes.placeholder).toBe("YYYY-MM-DDTHH:mm:ss");

    cell = new (Backgrid.DatetimeCell.extend({
      includeTime: false
    }))({
      model: model,
      column: column
    });
    expect(cell.editor.prototype.attributes.placeholder).toBe("YYYY-MM-DD");

    cell = new (Backgrid.DatetimeCell.extend({
      includeDate: false
    }))({
      model: model,
      column: column
    });
    expect(cell.editor.prototype.attributes.placeholder).toBe("HH:mm:ss");

    cell = new (Backgrid.DatetimeCell.extend({
      includeDate: false,
      includeMilli: true
    }))({
      model: model,
      column: column
    });
    expect(cell.editor.prototype.attributes.placeholder).toBe("HH:mm:ss.SSS");

    cell = new (Backgrid.DatetimeCell.extend({
      includeMilli: true
    }))({
      model: model,
      column: column
    });
    expect(cell.editor.prototype.attributes.placeholder).toBe("YYYY-MM-DDTHH:mm:ss.SSS");
  });

  it("is blank when the date value is null", function() {
    cell = new (Backgrid.DatetimeCell.extend({
      includeMilli: true
    }))({
      model: new Backbone.Model({ datetime: null }),
      column: column
    });
    expect(cell.$el.html()).toBe('');
  });

});

describe("A DateCell", function () {

  it("applies a date-cell class to the cell", function () {
    var cell = new Backgrid.DateCell({
      model: new Backbone.Model({
        date: "2000-01-01"
      }),
      column: {
        name: "date",
        cell: "date"
      }
    });
    cell.render();
    expect(cell.$el.hasClass("date-cell")).toBe(true);
  });
});

describe("A TimeCell", function () {

  it("applies a time-cell class to the cell", function () {
    var cell = new Backgrid.TimeCell({
      model: new Backbone.Model({
        time: "00:00:00"
      }),
      column: {
        name: "time",
        cell: "time"
      }
    });
    cell.render();
    expect(cell.$el.hasClass("time-cell")).toBe(true);
  });
});

describe("A BooleanCell", function () {

  var model;
  var column;
  var cell;

  beforeEach(function () {
    model = new Backbone.Model({
      ate: true
    });
    column = {
      name: "ate",
      cell: "boolean"
    };
    cell = new Backgrid.BooleanCell({
      model: model,
      column: column
    });
  });

  it("applies a boolean-cell class to the cell", function () {
    expect(cell.render().$el.hasClass("boolean-cell")).toBe(true);
  });

  it("has a display mode that renders a checkbox with the checkbox checked if the model value is true, not checked otherwise", function () {
    cell.render();
    expect(cell.$el.find(":checkbox").prop("checked")).toBe(true);
    model.set("ate", false);
    cell.render();
    expect(cell.$el.find(":checkbox").prop("checked")).toBe(false);
  });

  it("goes into edit mode after clicking the cell with the checkbox intact", function () {
    cell.render();
    cell.$el.click();
    expect(cell.$el.hasClass("editor")).toBe(true);
    expect(cell.$el.find(":checkbox").length).toBe(1);
  });

  it("goes into edit mode after calling `enterEditMode` with the checkbox intact", function () {
    cell.render();
    cell.enterEditMode();
    expect(cell.$el.hasClass("editor")).toBe(true);
    expect(cell.$el.find(":checkbox").length).toBe(1);
  });

  it("goes back to display mode after calling `exitEditMode`", function () {
    cell.render();
    cell.enterEditMode();
    cell.exitEditMode();
    expect(cell.$el.hasClass("editor")).toBe(false);
    expect(cell.$el.find(":checkbox").prop("checked")).toBe(true);
  });

  it("triggers `backgrid:edited` when the checkbox goes out of focus", function () {
    var backgridEditedTriggerCount = 0;
    var backgridEditedTriggerArgs;
    cell.model.on("backgrid:edited", function () {
      backgridEditedTriggerCount++;
      backgridEditedTriggerArgs = [].slice.call(arguments);
    });

    cell.render();
    cell.$el.click();
    cell.$el.find(":checkbox").blur();
    expect(backgridEditedTriggerCount).toBe(1);
    expect(backgridEditedTriggerArgs[0]).toBe(cell.model);
    expect(backgridEditedTriggerArgs[1]).toBe(cell.column);
    expect(backgridEditedTriggerArgs[2].passThru()).toBe(true);
    expect(cell.$el.find(":checkbox").prop("checked")).toBe(true);

    cell.render();
    cell.$el.click();
    cell.currentEditor.$el.mousedown();
    cell.$el.find(":checkbox").blur();
    expect(backgridEditedTriggerCount).toBe(1);
  });

  it("saves a boolean value to the model when the checkbox is toggled", function () {
    cell.render();
    cell.enterEditMode();
    cell.$el.find(":checkbox").prop("checked", false).change();
    expect(cell.model.get(cell.column.get("name"))).toBe(false);
  });

  describe("when the model value has changed", function () {
    it("refreshes during display mode", function () {
      cell.render();
      model.set("ate", false);
      expect(cell.$el.find(":checkbox").prop("checked")).toBe(false);
      model.set("ate", true);
      expect(cell.$el.find(":checkbox").prop("checked")).toBe(true);
    });

    it("does not refresh during display mode if the change was silenced", function () {
      cell.render();
      model.set("ate", false, {silent: true});
      expect(cell.$el.find(":checkbox").prop("checked")).toBe(true);
      model.set("ate", false);
      model.set("ate", true, {silent: true});
      expect(cell.$el.find(":checkbox").prop("checked")).toBe(true);
    });

    it("does not refresh during edit mode", function () {
      cell.render();
      cell.$el.click();
      model.set("ate", false);
      expect(cell.$el.find(":checkbox").prop("checked")).toBe(true);
    });
  });

});

describe("A SelectCellEditor", function () {

  var optionValues;
  var optionGroupValues;

  beforeEach(function () {
    optionValues = [
      ["Boy", 1],
      ["Girl", 2]
    ];

    optionGroupValues = [{
      "name": "\" ><script></script>Fruit",
      "values": [
        ["Apple<script></script>", "\" ><script></script>a"],
        ["Banana", "b"],
        ["Cantaloupe", "c"]
      ]
    }, {
      "name": "Cereal",
      "values": [
        ["Wheat", "w"],
        ["Rice", "r"],
        ["Maize", "m"]
      ]
    }];
  });

  it("renders a select box using a list if nvps", function () {

    var editor = new Backgrid.SelectCellEditor({
      formatter: new Backgrid.CellFormatter(),
      column: {
        name: "gender",
        cell: "select"
      },
      model: new Backbone.Model({
        gender: 2
      })
    });

    editor.setOptionValues(optionValues);
    editor.render();
    expect(editor.el.tagName).toBe("SELECT");
    var $options = editor.$el.children();
    expect($options.length).toBe(2);
    expect($options.eq(0).val()).toBe("1");
    expect($options.eq(0).prop("selected")).toBe(false);
    expect($options.eq(0).text()).toBe("Boy");
    expect($options.eq(1).val()).toBe("2");
    expect($options.eq(1).prop("selected")).toBe(true);
    expect($options.eq(1).text()).toBe("Girl");
  });

  it("renders a select box using a parameter-less function that returns a list if nvps", function () {

    var editor = new Backgrid.SelectCellEditor({
      formatter: new Backgrid.CellFormatter(),
      column: {
        name: "gender",
        cell: "select"
      },
      model: new Backbone.Model({
        gender: 2
      })
    });

    editor.setOptionValues(function () {
      return optionValues;
    });
    editor.render();
    expect(editor.el.tagName).toBe("SELECT");
    var $options = editor.$el.children();
    expect($options.length).toBe(2);
    expect($options.eq(0).val()).toBe("1");
    expect($options.eq(0).prop("selected")).toBe(false);
    expect($options.eq(0).text()).toBe("Boy");
    expect($options.eq(1).val()).toBe("2");
    expect($options.eq(1).prop("selected")).toBe(true);
    expect($options.eq(1).text()).toBe("Girl");
  });

  it("renders a select box using a list of object literals denoting option groups", function () {

    var editor = new Backgrid.SelectCellEditor({
      formatter: new Backgrid.CellFormatter(),
      column: {
        name: "food",
        cell: "select"
      },
      model: new Backbone.Model({
        food: "b"
      })
    });

    editor.setOptionValues(optionGroupValues);
    editor.render();
    var $optionGroups = editor.$el.children();
    expect($optionGroups.length).toBe(2);

    var $group1 = $optionGroups.eq(0);
    var $group2 = $optionGroups.eq(1);

    expect($group1.attr("label")).toBe("\" ><script></script>Fruit");
    expect($group2.attr("label")).toBe("Cereal");

    var $group1Options = $group1.children();
    expect($group1Options.eq(0).val()).toBe("\" ><script></script>a");
    expect($group1Options.eq(0).prop("selected")).toBe(false);
    expect($group1Options.eq(0).html()).toBe("Apple&lt;script&gt;&lt;/script&gt;");
    expect($group1Options.eq(1).val()).toBe("b");
    expect($group1Options.eq(1).prop("selected")).toBe(true);
    expect($group1Options.eq(1).text()).toBe("Banana");
    expect($group1Options.eq(2).val()).toBe("c");
    expect($group1Options.eq(2).prop("selected")).toBe(false);
    expect($group1Options.eq(2).text()).toBe("Cantaloupe");

    var $group2Options = $group2.children();
    expect($group2Options.eq(0).val()).toBe("w");
    expect($group2Options.eq(0).prop("selected")).toBe(false);
    expect($group2Options.eq(0).text()).toBe("Wheat");
    expect($group2Options.eq(1).val()).toBe("r");
    expect($group2Options.eq(1).prop("selected")).toBe(false);
    expect($group2Options.eq(1).text()).toBe("Rice");
    expect($group2Options.eq(2).val()).toBe("m");
    expect($group2Options.eq(2).prop("selected")).toBe(false);
    expect($group2Options.eq(2).text()).toBe("Maize");
  });

  it("renders a select box using a parameter-less function that returns a list of object literals denoting option groups", function () {

    var editor = new Backgrid.SelectCellEditor({
      formatter: new Backgrid.CellFormatter(),
      column: {
        name: "food",
        cell: "select"
      },
      model: new Backbone.Model({
        food: "b"
      })
    });

    editor.setOptionValues(function () {
      return optionGroupValues;
    });
    editor.render();
    var $optionGroups = editor.$el.children();
    expect($optionGroups.length).toBe(2);

    var $group1 = $optionGroups.eq(0);
    var $group2 = $optionGroups.eq(1);

    expect($group1.attr("label")).toBe("\" ><script></script>Fruit");
    expect($group2.attr("label")).toBe("Cereal");

    var $group1Options = $group1.children();
    expect($group1Options.eq(0).val()).toBe("\" ><script></script>a");
    expect($group1Options.eq(0).prop("selected")).toBe(false);
    expect($group1Options.eq(0).html()).toBe("Apple&lt;script&gt;&lt;/script&gt;");
    expect($group1Options.eq(1).val()).toBe("b");
    expect($group1Options.eq(1).prop("selected")).toBe(true);
    expect($group1Options.eq(1).text()).toBe("Banana");
    expect($group1Options.eq(2).val()).toBe("c");
    expect($group1Options.eq(2).prop("selected")).toBe(false);
    expect($group1Options.eq(2).text()).toBe("Cantaloupe");

    var $group2Options = $group2.children();
    expect($group2Options.eq(0).val()).toBe("w");
    expect($group2Options.eq(0).prop("selected")).toBe(false);
    expect($group2Options.eq(0).text()).toBe("Wheat");
    expect($group2Options.eq(1).val()).toBe("r");
    expect($group2Options.eq(1).prop("selected")).toBe(false);
    expect($group2Options.eq(1).text()).toBe("Rice");
    expect($group2Options.eq(2).val()).toBe("m");
    expect($group2Options.eq(2).prop("selected")).toBe(false);
    expect($group2Options.eq(2).text()).toBe("Maize");
  });

  it("saves the value to the model on change", function () {

    var editor = new Backgrid.SelectCellEditor({
      formatter: new Backgrid.CellFormatter(),
      column: {
        name: "gender",
        cell: "select"
      },
      model: new Backbone.Model({
        gender: 2
      })
    });

    editor.setOptionValues(optionValues);
    editor.render();

    spyOn(editor.formatter, "toRaw").andCallThrough();
    spyOn(editor, "trigger").andCallThrough();

    var backgridEditedTriggerCount = 0;
    var backgridEditedTriggerArgs;
    editor.model.on("backgrid:edited", function () {
      backgridEditedTriggerCount++;
      backgridEditedTriggerArgs = [].slice.call(arguments);
    });

    editor.$el.val(1).change();
    expect(editor.formatter.toRaw).toHaveBeenCalledWith("1");
    expect(editor.formatter.toRaw.calls.length).toBe(1);
    expect(editor.model.get(editor.column.get("name"))).toBe("1");

    expect(backgridEditedTriggerCount).toBe(1);
    expect(backgridEditedTriggerArgs[0]).toEqual(editor.model);
    expect(backgridEditedTriggerArgs[1]).toEqual(editor.column);
    expect(backgridEditedTriggerArgs[2].passThru()).toBe(true);
  });

  it("saves the value to the model on blur if there's only one option", function () {
    var editor = new Backgrid.SelectCellEditor({
      formatter: new Backgrid.CellFormatter(),
      column: {
        name: "gender",
        cell: "select"
      },
      model: new Backbone.Model()
    });
    editor.setOptionValues([["Boy", "1"]]);
    editor.render();

    editor.$el.blur();
    expect(editor.model.get(editor.column.get("name"))).toBe("1");
  });

});

describe("A SelectCell", function () {
  var optionValues;
  var optionGroupValues;

  beforeEach(function () {
    optionValues = [
      ["Boy", 1],
      ["Girl", 2]
    ];

    optionGroupValues = [{
      "name": "Fruit",
      "values": [
        ["Apple", "a"],
        ["Banana", "b"],
        ["Cantaloupe", "c"]
      ]
    }, {
      "name": "Cereal",
      "values": [
        ["Wheat", "w"],
        ["Rice", "r"],
        ["Maize", "m"]
      ]
    }];
  });

  it("throws TypeError is optionValues is undefined", function () {

    expect(function () {
      new Backgrid.SelectCell({
        column: {
          name: "gender",
          cell: "select"
        },
        model: new Backbone.Model({
          gender: "m"
        })
      });
    }).toThrow(new TypeError("'optionValues' is required"));

  });

  it("applies a select-cell class to the cell", function () {
    var cell = new (Backgrid.SelectCell.extend({
      optionValues: optionValues
    }))({
      column: {
        name: "gender",
        cell: "select"
      },
      model: new Backbone.Model({
        gender: 2
      })
    });

    cell.render();

    expect(cell.$el.hasClass("select-cell")).toBe(true);
  });

  it("renders the label of the selected option in display mode", function () {
    var cell = new (Backgrid.SelectCell.extend({
      optionValues: optionValues
    }))({
      column: {
        name: "gender",
        cell: "select"
      },
      model: new Backbone.Model({
        gender: 2
      })
    });

    cell.render();
    expect(cell.$el.text()).toBe("Girl");

    var cell = new (Backgrid.SelectCell.extend({
      optionValues: optionGroupValues
    }))({
      column: {
        name: "food",
        cell: "select"
      },
      model: new Backbone.Model({
        food: "b"
      })
    });

    cell.render();
    expect(cell.$el.text()).toBe("Banana");
  });

  it("throws TypeError when rendering a malformed option value list", function () {

    expect(function () {
      var cell = new (Backgrid.SelectCell.extend({
        optionValues: []
      }))({
        column: {
          name: "gender",
          cell: "select"
        },
        model: new Backbone.Model({
          gender: 2
        })
      });

      cell.render();

    }).toThrow(new TypeError("'optionValues' must be of type {Array.<Array>|Array.<{name: string, values: Array.<Array>}>}"));
  });

  describe("when the model value has changed", function () {

    var cell;
    var model;

    var optionValues = [
      ["Boy", 1],
      ["Girl", 2]
    ];

    beforeEach(function () {
      model = new Backbone.Model({
        gender: 2
      });

      cell = new (Backgrid.SelectCell.extend({
        optionValues: optionValues
      }))({
        column: {
          name: "gender",
          cell: "select"
        },
        model: model
      });
    });

    it("refreshes during display mode", function () {
      cell.render();
      model.set("gender", 1);
      expect(cell.$el.text()).toBe("Boy");
    });

    it("does not refresh during display mode if the change was silenced", function () {
      cell.render();
      model.set("gender", 1, {silent: true});
      expect(cell.$el.text()).toBe("Girl");
    });

    it("does not refresh during edit mode", function () {
      cell.render();
      cell.$el.click();
      model.set("gender", 1);
      expect(cell.$el.find("option[selected]").val()).toBe("2");
      expect(cell.$el.find("option[selected]").text()).toBe("Girl");
    });
  });

});
