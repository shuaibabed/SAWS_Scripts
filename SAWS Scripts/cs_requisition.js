/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/record', 'N/error', 'N/search', 'N/ui/dialog'],
  function(record, error, search, dialog) {
    function getPeriodInfo(tranDate) {
      log.debug('getPeriodInfo', 'BEGIN');
      var periodSearchObj = search.create({
        type: "accountingperiod",
        filters: [
          ["isyear", "is", "T"],
          "AND", ["startdate", "onorbefore", tranDate],
          "AND", ["enddate", "onorafter", tranDate]
        ],
        columns: [
          search.createColumn({
            name: "periodname"
          }),
          search.createColumn({
            name: "startdate"
          }),
          search.createColumn({
            name: "enddate"
          })
        ]
      });
      var periodSearch = periodSearchObj.run().getRange({
        "start": 0,
        "end": 1000
      }) || [];
      log.debug('periodSearch', periodSearch);
      if (periodSearch.length > 0) {
        var result = {
          period: periodSearch[0].getValue('periodname'),
          startdate: periodSearch[0].getValue(
            'startdate'),
          enddate: periodSearch[0].getValue('enddate')
        };
      } else {
        var result = 0
      }
      log.debug('getPeriodInfo', 'END');
      return result;
    }

    function getBudget(accountNumber, costCentre, periodYear) {
      log.debug('getBudget', 'BEGIN');
      log.debug('periodYear', periodYear);
      var budgetimportSearchObj = search.create({
        type: "budgetimport",
        filters: [
          ["account", "anyof", accountNumber],
          "AND", ["department", "anyof", costCentre],
          "AND", ["year", "is", periodYear]
        ],
        columns: [
          search.createColumn({
            name: "account",
            sort: search.Sort.ASC,
            label: "Account"
          }),
          search.createColumn({
            name: "year",
            label: "Year"
          }),
          search.createColumn({
            name: "department",
            label: "Cost Center"
          }),
          search.createColumn({
            name: "amount",
            label: "Amount"
          })
        ]
      });
      var budgetimportSearch = budgetimportSearchObj.run().getRange({
        "start": 0,
        "end": 1000
      }) || [];
      for (var i = 0; i < budgetimportSearch.length; i++) {
        if (budgetimportSearch[i].getValue('year') == periodYear) {
          var returnAmount = budgetimportSearch[i].getValue('amount');
        }
      }
      log.debug('budgetimportSearch', budgetimportSearch);
      log.debug('getBudget', 'END');

      if (budgetimportSearch.length > 0) {
        return returnAmount;
      } else {
        return 0;
      }
    }

    function getActuals(accountNumber, costCentre, startdate, enddate) {
      // TODO: Add filter for current year for getActuals
      var accountSearchObj = search.create({
        type: "transaction",
        filters: [
          ["posting", "is", "T"],
          "AND", ["approvalstatus", "anyof", "2"],
          "AND", ["department", "anyof", costCentre],
          "AND", ["accounttype", "anyof", "FixedAsset", "OthAsset",
            "OthCurrAsset", "Expense", "OthExpense", "DeferExpense"
          ],
          "AND", ["account", "anyof", accountNumber],
          "AND", ["trandate", "onorafter", startdate],
          "AND", ["trandate", "onorbefore", enddate]
        ],
        columns: [
          search.createColumn({
            name: "account",
            summary: "GROUP",
            label: "Account"
          }),
          search.createColumn({
            name: "amount",
            summary: "SUM",
            label: "Amount"
          })
        ]
      });
      var accountSearch = accountSearchObj.run().getRange({
        "start": 0,
        "end": 1000
      }) || [];
      if (accountSearch.length > 0) {
        var returnValue = accountSearch[0].getValue({
          name: 'amount',
          summary: 'SUM'
        });
      } else {
        var returnValue = 0;
      }
      return returnValue;
    }

    function getVouchers(accountNumber, costCentre, startdate, enddate) {
      var voucherSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "VendCred", "VendBill"],
          "AND", ["mainline", "is", "F"],
          "AND", ["status", "anyof", "VendBill:D"],
          "AND", ["account", "anyof", accountNumber],
          "AND", ["department", "anyof", costCentre],
          "AND", ["trandate", "onorafter", startdate],
          "AND", ["trandate", "onorbefore", enddate]
        ],
        columns: [
          search.createColumn({
            name: "amount",
            summary: "SUM",
            label: "Amount"
          })
        ]
      });
      var voucherSearch = voucherSearchObj.run().getRange({
        "start": 0,
        "end": 1000
      }) || [];
      returnAmount = voucherSearch[0].getValue({
        name: 'amount',
        summary: 'SUM'
      });
      if (!returnAmount) {
        returnAmount = 0;
      }
      return returnAmount;
    }

    function getRequisitions(accountNumber, costCentre, startdate, enddate, reqID) {
      var requisitionSearchObj = search.create({
        type: "purchaserequisition",
        filters: [
          ["type", "anyof", "PurchReq"],
          "AND", ["status", "anyof", "PurchReq:A", "PurchReq:B"],
          "AND", ["accounttype", "anyof", "OthCurrAsset",
            "FixedAsset", "OthAsset", "Expense", "OthExpense",
            "DeferExpense"
          ],
          "AND", ["department", "anyof", costCentre],
          "AND", ["account", "anyof", accountNumber],
          "AND", ['voided', 'is', 'F'],
          "AND", ["trandate", "onorafter", startdate],
          "AND", ["trandate", "onorbefore", enddate],
          "AND", ["internalid", "noneof", reqID]
        ],
        columns: [
          search.createColumn({
            name: "estimatedamount",
            summary: "SUM",
            label: "Estimated Amount"
          })
        ]
      });
      var requisitionSearch = requisitionSearchObj.run().getRange({
        "start": 0,
        "end": 1000
      }) || [];
      if (requisitionSearch) {
        returnAmount = requisitionSearch[0].getValue({
          name: 'estimatedamount',
          summary: 'SUM'
        });
        return returnAmount;
      } else {
        return 0;
      }
    }

    function getOrders(accountNumber, costCentre, startdate, enddate) {
      var orderSearchObj = search.create({
        type: "purchaseorder",
        filters: [
          ["type", "anyof", "PurchOrd"],
          "AND", ["status", "anyof", "PurchOrd:P", "PurchOrd:A",
            "PurchOrd:B", "PurchOrd:E", "PurchOrd:F", "PurchOrd:D"
          ],
          "AND", ["accounttype", "anyof", "OthCurrAsset",
            "FixedAsset", "OthAsset", "Expense", "OthExpense",
            "DeferExpense"
          ],
          "AND", ["department", "anyof", costCentre],
          "AND", ["account", "anyof", accountNumber],
          "AND", ["trandate", "onorafter", startdate],
          "AND", ["trandate", "onorbefore", enddate]
        ],
        columns: [
          search.createColumn({
            name: "amount",
            summary: "SUM",
            label: "Amount"
          })
        ]
      });

      var orderSearch = orderSearchObj.run().getRange({
        "start": 0,
        "end": 1000
      }) || [];
      returnAmount = orderSearch[0].getValue({
        name: 'amount',
        summary: 'SUM'
      });
      if (!returnAmount) {
        returnAmount = 0;
      }
      return returnAmount;
    }

    function getAccountNumber(itemNumber) {
      var itemSearchObj = search.create({
        type: "item",
        filters: [
          ["internalid", "anyof", itemNumber]
        ],
        columns: [
          search.createColumn({
            name: "expenseaccount",
            label: "Expense/COGS Account"
          })
        ]
      });
      var itemSearch = itemSearchObj.run().getRange({
        "start": 0,
        "end": 1000
      }) || [];
      if (itemSearch) {
        return itemSearch[0].getValue('expenseaccount');
      } else {
        return 0;
      }
    }

    function saveRecord(context) {
      // TODO: Get the Current Year
      var requisitionRec = context.currentRecord;
      var budgetFlag = 0;
      if (requisitionRec.id) {
        var requisitionRecID = requisitionRec.id;
      } else 
        {
          var requisitionRecID = 0;
        }
      log.debug('Budget Check', 'Start');
      //if it is not blank
      if (requisitionRec) {
        var itemCount = requisitionRec.getLineCount({
          sublistId: 'expense'
        });
        var transDate = requisitionRec.getText('trandate');
        log.debug('Transaction Date', transDate);
        var periodDetails = getPeriodInfo(transDate);
        log.debug('periodDetails', periodDetails);
        if (itemCount > 0) {
          var sublistName = 'expense';
        } else {
          var sublistName = 'item';
          itemCount = requisitionRec.getLineCount({
            sublistId: 'item'
          });
        }
        if (sublistName=='expense'){
        var listRows = [{
          account: 'accountNumber',
          dept: 'costCentre',
          amount: 0.00
        }];
        for (var i = 0; i < itemCount; i++) {
          var accountNumber = requisitionRec.getSublistValue({
            sublistId: sublistName,
            fieldId: 'account',
            line: i
          });
          if (!accountNumber) {
            var itemNumber = requisitionRec.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i
            });
            accountNumber = getAccountNumber(itemNumber);
          }
          var costCentre = requisitionRec.getSublistValue({
            sublistId: sublistName,
            fieldId: 'department',
            line: i
          });
          var estimatedAmount = requisitionRec.getSublistValue({
            sublistId: sublistName,
            fieldId: 'estimatedamount',
            line: i
          });
          listRows[i] = {
            account: accountNumber,
            dept: costCentre,
            amount: estimatedAmount
          };
        }
        //listRows.sort((a, b) => (a.account > b.account) ? 1 : -1);
        function compare(a, b) {
          // Use toUpperCase() to ignore character casing
          const accountA = a.account;
          const accountB = b.account;

          var comparison = 0;
          if (accountA > accountB) {
            comparison = 1;
          } else if (accountA < accountB) {
            comparison = -1;
          }
          return comparison;
        }
        var listSummary = listRows.sort(compare);
        var listCounter = 0;
        for (var i = 0; i < itemCount; i++) {
          if (i > 0 && listRows[i].account == listRows[i - 1].account) {
            listSummary[listCounter].amount += listRows[i].amount;
          } else {
            listCounter++;
            listSummary[listCounter] = listRows[i];
          }
        }
        for (var i = 1; i <= listCounter; i++) {
          var budgetAmount = getBudget(listSummary[i].account, listSummary[
            i].dept, periodDetails.period);
          var actualsAmount = getActuals(listSummary[i].account,
            listSummary[i].dept, periodDetails.startdate, periodDetails.enddate
          );
          var unapprovedVouchers = getVouchers(listSummary[i].account,
            listSummary[i].dept, periodDetails.startdate, periodDetails.enddate
          );
          var openRequisitions = getRequisitions(listSummary[i].account,
            listSummary[i].dept, periodDetails.startdate, periodDetails.enddate, requisitionRecID
          );
          var openOrders = getOrders(listSummary[i].account,
            listSummary[i].dept, periodDetails.startdate, periodDetails.enddate
          );
          var thisAmount = Number(listSummary[i].amount);
          log.debug('budgetAmount', budgetAmount);
          log.debug('actualsAmount', actualsAmount);
          log.debug('unapprovedVouchers', unapprovedVouchers);
          log.debug('openRequisitions', openRequisitions);
          log.debug('openOrders', openOrders);
          log.debug('thisAmount', thisAmount);

          var budgetUsed = Number(openRequisitions) + Number(
              unapprovedVouchers) +
            Number(actualsAmount) + Number(openOrders) + Number(thisAmount);
          log.debug('budgetUsed', budgetUsed);
          var budgetAvailable = Number(budgetAmount) - Number(budgetUsed);
          //var budgetAvailable = number(budgetUsed);
          log.debug('budgetAvailable', Number(budgetAvailable));
          log.debug('account', listSummary[i].account);
          log.debug('dept', listSummary[i].dept);

          if ((Number(budgetAvailable) <= 0) && (listSummary[i].account !=
              336) && (listSummary[i].dept != 607)) {
            //if ((Number(budgetAvailable) <= 0)) {
            budgetFlag = 1;
          }
          log.debug('budgetFlag', budgetFlag);
        }
      }} else {var budgetFlag = 0}
      if (budgetFlag > 0) {
        dialog.alert({
          title: 'Budget Not Available',
          message: 'The Budget for one or more items on this order is not available. Please check your request or contact the Cost Centre Manager for this request'
        });
        return false;
      } else {
        return true;
      }
    }
    return {
      saveRecord: saveRecord
    };
  }
);
