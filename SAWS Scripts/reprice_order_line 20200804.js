/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/record', 'N/error', 'N/search', 'N/format', 'N/email'],
    function (record, error, search, format, email) {
        function itemInfo(itemNumber) {
            var nfilters = ['internalid', 'is', itemNumber];
            var ncolumns = ['price', 'parent', 'custitem9'];
            var searchQuery = search.create({
                "type": 'item',
                "filters": nfilters,
                "columns": ncolumns
            });
            var foundItems = searchQuery.run().getRange({
                "start": 0,
                "end": 1000
            }) || [];
            return {
                basePrice: foundItems[0].getValue('price'),
                item: foundItems[0].getText('parent'),
                parentItem: foundItems[0].getText('parent'),
                periodType: foundItems[0].getText('custitem9')
            };
        }

        function pageInit(context) {
            var currentRecord = context.currentRecord;
            currentRecord.getField({
                fieldId: 'custbody82'
            }).isDisplay = false;
            currentRecord.getField({
                fieldId: 'custbody83'
            }).isDisplay = false;
            currentRecord.getField({
                fieldId: 'custbody84'
            }).isDisplay = false;
            currentRecord.getField({
                fieldId: 'custbody85'
            }).isDisplay = false;
            currentRecord.getField({
                fieldId: 'custbody86'
            }).isDisplay = false;
        }

        function validateLine(context) {
            //Get the Sales Order Line that was just entered
            var salesOrderLine = context.currentRecord;
            //if it is not blank
            if (salesOrderLine) {
                //get the sublist item and the field options
                var itemOptions = salesOrderLine.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'options'
                });
                if (itemOptions.length != 0) {
                    var itemNr = salesOrderLine.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    var itemData = itemInfo(itemNr);
                    itemData.item = salesOrderLine.getCurrentSublistText({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    var cString = String.fromCharCode(4);
                    var set_of_option_array = itemOptions.split(cString);
                    //var number_options = set_of_option_array.length;
                    var ext_String = String.fromCharCode(3);
                    var variables_list = ['Cloud amount (at 08:00, 14:00 & 20:00)', 'Cloud types (at 08:00, 14:00 & 20:00)', 'Cloudiness', 'Dew-point temperature', 'Dew-point temperature (at 08:00, 14:00 & 20:00)', 'Dry-bulb temperature', 'Dry-bulb temperature (at 08:00, 14:00 & 20:00)', 'Height of pressure level', 'Maximum temperature', 'Minimum temperature', 'Pressure', 'Rain', 'Rainfall', 'Relative humidity', 'Relative humidity (at 08:00, 14:00 & 20:00)', 'Relative humidity at 1.5 m', 'Sunshine', 'Surface pressure', 'Temperature', 'Temperature at 1.5 m', 'Wet-bulb temperature', 'Wet-bulb temperature (at 08:00, 14:00 & 20:00)', 'Wind direction', 'Wind direction (at 08:00, 14:00 & 20:00)', 'Wind direction at 10 m', 'Wind gust', 'Wind speed', 'Wind speed (at 08:00, 14:00 & 20:00)', 'Wind speed (scalar)', 'Wind speed (vector)', 'Wind speed at 10 m', 'Pressure (at 08:00, 14:00 & 20:00)', 'Minimum humidity', 'Maximum humidity', 'Minimum pressure', 'Maximum pressure'];
                    var optionList = set_of_option_array.map(function (result) {
                        return {
                            key: result.split(ext_String)[2],
                            kvalue: result.split(ext_String)[3],
                            is_variable: variables_list.indexOf(result.split(ext_String)[2])
                        };
                    });
                    var variableItems = optionList.filter(checkVL);

                    function checkVL(optionList) {
                        return optionList.is_variable >= 0;
                    }
                    var selectedVariables = variableItems.filter(checkEN);

                    function checkEN(variableItems) {
                        return variableItems.kvalue == 'T';
                    }
                    var staticItems = optionList.filter(checkSA);

                    function checkSA(optionList) {
                        return optionList.is_variable < 0 && (optionList.kvalue);
                    }
                    var new_description = '';

                    var inputData = {
                        points: 1,
                        size_period_type: 1,
                        intervals: 1,
                        variables: 1,
                        forecast_days: 1,
                        advance_days: 1,
                        date_start: new Date(),
                        date_end: new Date(),
                        months_value: 0
                    };

                    var calcData = {
                        variables: 0.00,
                        quantity: 0.00,
                        period: 0.00,
                        levels: 0.00,
                        hours: 0.00,
                        days: 0.00,
                        base_maps: 744.00,
                        amount: 0.00
                    }

                    inputData.variables = selectedVariables.length;

                    staticItems.forEach(function (staticItems) {
                        new_description = new_description + staticItems.key + ': ' + staticItems.kvalue + String.fromCharCode(13);
                        switch (staticItems.key) {
                            case 'No of Months, Grid Points, Maps etc.':
                                inputData.size_period_type = staticItems.kvalue;
                                break;
                            case '1000 - 100 Hpa at 50 Hpa Intervals':
                                inputData.intervals = staticItems.kvalue;
                                break;
                            case 'No of Stations, Areas, Points, Regions':
                                inputData.points = staticItems.kvalue;
                                break;
                            case 'Forecast for how many days in advance?':
                                inputData.forecast_days = staticItems.kvalue;
                                break;
                            case 'Days for which the service is required':
                                inputData.advance_days = staticItems.kvalue;
                                break;
                            case 'Date Start':
                                inputData.date_start = staticItems.kvalue;
                                break;
                            case 'Date End':
                                inputData.date_end = staticItems.kvalue;
                                break;
                        }
                    });

                    if (inputData.size_period_type == 0) {
                        console.log(inputData.date_start);
                        console.log(inputData.date_end);
                        var sd = format.parse({
                            value: inputData.date_start,
                            type: format.Type.DATE
                        });
                        var ed = format.parse({
                            value: inputData.date_end,
                            type: format.Type.DATE
                        });
                        var sdy = sd.getFullYear();
                        var sdm = sd.getMonth();
                        var edy = ed.getFullYear();
                        var edm = ed.getMonth();
                        var m = (((edy - sdy) * 12) - sdm + edm) + 1;

                        console.log('From ' + sd + ' to ' + ed + ' Months = ' + m);
                        inputData.size_period_type = m;

                    }

                    //calcData.variables =
                    if (itemData.parentItem == 'Forecast') {
                        if (inputData.variables <= 3) {
                            calcData.variables = 1;
                        } else {
                            calcData.variables = (inputData.variables * 0.33);
                        }
                    } else {
                        calcData.variables = 1 + (inputData.variables - 1) * 0.2;
                    }

                    //calcData.period =
                    if (itemData.parentItem == 'Forecast') {
                        if (inputData.forecast_days == 1) {
                            calcData.period = 1;
                        } else {
                            calcData.period = (1 + inputData.forecast_days * 0.1);
                        }
                    } else {
                        if (itemData.periodType == 'Months') {
                            calcData.period = inputData.size_period_type / 12;
                        } else {
                            calcData.period = inputData.size_period_type;
                        }
                    }

                    //calcData.levels =
                    if (inputData.intervals == 0) {
                        calcData.levels = 0;
                    } else {
                        calcData.levels = 1 + (inputData.intervals - 1) * 0.2;
                    }
                    //calcData.hours =
                    if (inputData.quantity < 1) {
                        calcData.hours = 1;
                    } else {
                        calcData.levels;
                    }
                    //calcData.days =
                    if (inputData.advance_days == 1) {
                        calcData.advance_days = 1;
                    } else {
                        calcData.advance_days = 1 + inputData.advance_days * 0.2;
                    }
                    //calcData.quantity =
                    if (itemData.parentItem == 'Forecast') {
                        if (inputData.points < 3) {
                            calcData.quantity = 1;
                        } else {
                            calcData.quantity = 1 + (inputData.forecast_days * 0.06);
                        }
                    } else {
                        if (itemData.periodType != 'Years' && itemData.periodType != 'Months' && itemData.periodType != 'Days' &&
                            itemData.periodType != 'Images' && itemData.periodType != 'Grid Points' && itemData.periodType != 'Radius') {
                            calcData.quantity = inputData.size_period_type;
                        } else {
                            if (itemData.periodType == 'Radius' && calcData.period < 21) {
                                calcData.quantity = 20;
                            } else {
                                if (itemData.periodType == 'Grid Points' && inputData.size_period_type < 9) {
                                    calcData.quantity = 8;
                                } else {
                                    if (itemData.periodType == 'Images' || itemData.periodType == 'Days') {
                                        calcData.quantity = 1 + (calcData.period - 1) * 0.2;
                                    } else {
                                        if (calcData.period * 0.5) {
                                            if (calcData.period > 1) {
                                                calcData.quantity = calcData.period
                                            } else {
                                                calcData.quantity = 1 + (calcData.period - 1) * 0.2;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    //Calculation Items
                    log.debug({
                        basePrice: itemData.basePrice
                    });
                    log.debug({
                        periodType: itemData.periodType
                    });
                    log.debug({
                        variables: calcData.variables
                    });
                    log.debug({
                        quantity: calcData.quantity
                    });
                    log.debug({
                        period: calcData.period
                    });
                    log.debug({
                        levels: calcData.levels
                    });
                    log.debug({
                        hours: calcData.hours
                    });
                    log.debug({
                        days: calcData.days
                    });
                    if (itemData.parentItem == 'Forecast') {
                        calcData.amount = itemData.basePrice * calcData.variables * calcData.quantity * calcData.period * calcData.hours * calcData.days;
                    } else {
                        if (itemData.periodType == 'Grid Points') {
                            calcData.amount = calcData.base_maps + (inputData.points * itemData.basePrice * calcData.variables * calcData.quantity) * calcData.levels;
                        } else {
                            calcData.amount = inputData.points * itemData.basePrice * calcData.variables * calcData.quantity * calcData.levels;
                        }
                    }
                    new_description = new_description + 'Options:';
                    selectedVariables.forEach(function (selectedVariables) {
                        new_description = new_description + String.fromCharCode(13) + selectedVariables.key
                    });
                    if (m) {
                        new_description = new_description + String.fromCharCode(13) + m + ' months';
                    }
                    if (salesOrderLine.getText('custbody61') == 'Research') {
                        calcData.amount = calcData.amount * .15;
                    }
                    /*
                      if (salesOrderLine.getText('custbody61') == 'Public Good') {
                          calcData.amount = 0;
                      }
                      */
                    salesOrderLine.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        value: new_description
                    });
                    salesOrderLine.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: Math.round(calcData.amount)
                    });
                }
            }
            return true;
        }

        function fieldChanged(context) {
            var currentRecord = context.currentRecord;
            var fieldId = context.fieldId;
            if (fieldId === 'custbody61') {
                var selectedType = currentRecord.getText(fieldId);
                if (selectedType == 'Public Good') {
                    currentRecord.getField({
                        fieldId: 'custbody82'
                    }).isDisplay = true;
                    currentRecord.getField({
                        fieldId: 'custbody83'
                    }).isDisplay = true;
                    currentRecord.getField({
                        fieldId: 'custbody84'
                    }).isDisplay = true;
                    currentRecord.getField({
                        fieldId: 'custbody85'
                    }).isDisplay = true;
                } else {
                    currentRecord.getField({
                        fieldId: 'custbody82'
                    }).isDisplay = false;
                    currentRecord.getField({
                        fieldId: 'custbody83'
                    }).isDisplay = false;
                    currentRecord.getField({
                        fieldId: 'custbody84'
                    }).isDisplay = false;
                    currentRecord.getField({
                        fieldId: 'custbody85'
                    }).isDisplay = false;
                }
                if (selectedType == 'Public Service') {
                    currentRecord.getField({
                        fieldId: 'custbody86'
                    }).isDisplay = true;
                } else {
                    currentRecord.getField({
                        fieldId: 'custbody86'
                    }).isDisplay = false;
                }
            }
        }

        function saveRecord(context) {
            var quoteRecord = context.currentRecord;
            if (!quoteRecord.getValue('custbody41')) {
                var customerRecord = record.load({ type: 'customer', id: quoteRecord.getValue('entity') });
                var jdeNumber = customerRecord.getValue('custentitycustentity10');
                var jdeLongNumber = customerRecord.getValue('custentityjde_alky');
                if (!jdeLongNumber) {
                    if (!jdeNumber) {
                        var accountNumber = quoteRecord.getValue('entitynumber');
                    } else {
                        var accountNumber = jdeNumber;
                    }
                } else {
                    var accountNumber = jdeLongNumber;
                }
                quoteRecord.setValue({ fieldId: 'custbody41', value: accountNumber });
            }
            if(quoteRecord.getValue('tranid')){
                log.debug({
                    title: 'Salesperson',
                    details: 'Edit'
                })
            } else {
                log.debug({
                    title: 'Salesperson',
                    details: 'Create'
                })
            }
            return true;
        }
        return {
            pageInit: pageInit,
            validateLine: validateLine,
            saveRecord: saveRecord,
            fieldChanged: fieldChanged
        };
    }
);
