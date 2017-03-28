/*
* 将自定义树做成插件
* 树的数据分两次加载。首先加载文件夹的数据，再加载文件的数据
* 树的数据默认都包含id,text。
*/


(function ($) {

    //定义属性
    var settings = {
        idField: "TerminalTag",
        foIdField: "OrgTag",
        text1Field: "PlateNo",
        text2Field: "TerminalID",
        iconField: "",
        icon: "icon-status-offline",
        checkbox: true,  //是否显示复选
        checked: true,     //是否选中
        singleSelect: true, //只允许单选
        showHide: true,  //是否显示隐含字段
        expandFo: true,  //是否展开树
        expandFi: true, //是否展开树的子节点
        treeDataType: "fc", //[fc:father/children数据结构类型；ip:id/pid数据结构类型]
        foData: [],
        foUrl: '',
        onFoClick: function () { },
        onFiClick: function (checkFlag, value) { },
        onFiDblClick: function (checkFlag, value) { },
        onFoCheck: function (checkFlag, value) { },
        onFiCheck: function (checkFlag, value) { },
        onFiContextMenu: function (e, checkFlag, value) { },
        onFiMidClick: function (e, checkFlag, value) { }
    };


    //通用变量值
    var theCommonValue = {
        loadCount: 0,
        theFoIdArrary: [],
        clickInterval: null,
        isChkFlag: false
    }


    var commonFun = {
        checkCarCheckStatus: function (orgid) {
            var orgdom = $("#d" + orgid).parent();
            if (orgdom !== undefined) {
                var carChkDom = ($(orgdom).find(".carChecked")).length;
                var carNoChkDom = ($(orgdom).find(".carNoChecked")).length;

                //有全选或全未选的时候
                if (carChkDom * carNoChkDom == 0) {
                    if (carChkDom == 0) {   //如果有车辆全未选中的时候
                        $("#d" + orgid + " .orgChkboxShow").removeClass().addClass("orgChkboxShow orgNoCheck");
                    } else {
                        $("#d" + orgid + " .orgChkboxShow").removeClass().addClass("orgChkboxShow orgChecked");
                    }
                } else {
                    $("#d" + orgid + " .orgChkboxShow").removeClass().addClass("orgChkboxShow orgImChecked");
                }
            }
        },
        stringisInt: function (str) {
            var regFloat = /^[0-9]*$/;
            return regFloat.test(str);
        },
        //取消所有父组织的选中状态
        uncheckParent: function (id, chkflag) {
            var theParent = $("#d" + id + "Car").parent().parent();
            var theParentId = $(theParent).attr("id");
            var foFlag = (theParentId.substring(0, 1) == "d" && theParentId.substring(theParentId.length - 3, theParentId.length) == "Car");
            theParentId = theParentId.substring(1, theParentId.length - 3);
            if (foFlag) {  // commonFun.stringisInt(theParentId)
                var orgdom = $("#d" + theParentId).parent();
                var carChkDom = ($(orgdom).find(".carChecked")).length;
                var carNoChkDom = ($(orgdom).find(".carNoChecked")).length;
                //有全选或全未选的时候
                if (carChkDom * carNoChkDom == 0) {
                    //如果是选中
                    if (carChkDom == 0) {   //如果有车辆全未选中的时候
                        $("#d" + theParentId + " .orgChkboxShow").removeClass().addClass("orgChkboxShow orgNoCheck");
                    } else {
                        $("#d" + theParentId + " .orgChkboxShow").removeClass().addClass("orgChkboxShow orgChecked");
                    }
                } else {
                    $("#d" + theParentId + " .orgChkboxShow").removeClass().addClass("orgChkboxShow orgImChecked");
                }
                commonFun.uncheckParent(theParentId, chkflag);
            }
        },
        scrollerToView: function (cardom) {
            var carListScroller = document.getElementById("carListContainer");
            var willScrollTop = ((cardom.offset().top - cardom.height() - 30) * (carListScroller.scrollHeight)) / (carlistDom.height());
            if (cardom.offset().top > (carlistDom.offset().top + 100)) {
                carListScroller.scrollTop = carListScroller.scrollTop + willScrollTop;
            }
        },
        openFo: function (foId) {
            $("#" + foId).show().addClass("orgNameSelect");
            $("#" + foId + "Car").show();
            var parentOrgDom = $("#" + foId).parent().parent();
            if (parentOrgDom !== undefined) {
                var theParentOrg = parentOrgDom[0].id;
                if (theParentOrg != "theCarList") openParentOrg(theParentOrg.substring(0, theParentOrg.length - 3));
            }
        },
        getNodeData: function (dom, theBroDom) {
            var CarTag = $($(theBroDom).find(".terminalTag")).html();  //获取车辆编号
            var orgTag = $($(theBroDom).find(".orgtag")).html();        //获取组织编号
            var textField = $($(theBroDom).find(".textField")).html();  //获取车辆编号
            var hideField = $($(theBroDom).find(".hideField")).html();        //获取组织编号
            var checkFlag = $(dom).hasClass("carChecked");
            return {
                id: CarTag,
                foId: orgTag,
                text: textField,
                hideText: hideField,
                checked: checkFlag,
                dom: dom
            }
        }
    }


    //初始化时绑定事件。
    var bindEvent = {
        bindFoEvent: function () {
            //组织的点击事件。
            $(".orgName").unbind().live("click", function () {
                var theId = this.id;
                $("#" + theId + "Car").toggle();
                $(this).toggleClass("orgNameSelect");
            })

            //文件夹的选中和不选中。
            $(".orgChkboxShow").unbind().live("click", function (event) {
                event.stopPropagation(); //阻止事件冒泡
                var orgDomObj = this;
                var checkFlag = $(orgDomObj).hasClass("orgChecked");
                var thisParentObj = $(orgDomObj).parent().parent();
                var childObjDoms = $(thisParentObj[0]).find(".orgChkboxShow");
                var childCarDoms = $(thisParentObj[0]).find(".carChkboxShow");
                //===========================
                //当前组织勾选
                if (checkFlag) {
                    $(orgDomObj).removeClass().addClass("orgChkboxShow orgNoCheck");
                } else {
                    $(orgDomObj).removeClass().addClass("orgChkboxShow orgChecked");
                }

                //子组织勾选
                $(childObjDoms).each(function () {
                    if (checkFlag) {
                        $(this).removeClass().addClass("orgChkboxShow orgNoCheck");
                    } else {
                        $(this).removeClass().addClass("orgChkboxShow orgChecked");
                    }
                })

                //===========================================
                //用来保存树选择组织的时候组织下所有的车辆。
                var theCarList = [];
                $(childCarDoms).each(function () {
                    if (checkFlag) {
                        $(this).removeClass("carChecked").addClass("carNoChecked");
                    } else {
                        $(this).removeClass("carNoChecked").addClass("carChecked");
                    }
                    var theBroDom = $(this).parent().parent();
                    var carTag = $($(theBroDom).find(".terminalTag")).html();  //获取车辆编号
                    theCarList.push(carTag); //获取车辆编号
                })
                //===========================================
                //将所有父组织置空
                var theOrgTag = $($(orgDomObj).parent()).attr("id");
                commonFun.uncheckParent(theOrgTag.substring(1, theOrgTag.length), checkFlag);
                settings.onFoCheck(checkFlag, theCarList); //==============================================
            })
        },
        bindFiEvent: function () {
            //车辆的点击事件。
            $(".carItem").unbind().live("click", function (e) {
                e.stopPropagation();   //阻止事件冒泡
                var cardomObj = $(this);
                var tag = this.id.toString().split("_")[0];
                var checkFlag = $(cardomObj).find(".carChecked");
                checkFlag = ((checkFlag.length > 0) || !settings.checkbox) ? true : false;
                if (settings.singleSelect) $(".carItem").removeClass("carItemSelected");
                if ($(cardomObj).hasClass("carItemSelected")) {
                    if (!settings.singleSelect) cardomObj.removeClass("carItemSelected");
                } else {
                    cardomObj.addClass("carItemSelected");
                }
                settings.onFiClick(checkFlag, tag);
            });


            $(".carItem").unbind().live("mousedown", function (e) {
                e.stopPropagation();   //阻止事件冒泡
                var cardomObj = $(this);
                var tag = this.id.toString().split("_")[0];
                var checkFlag = $(cardomObj).find(".carChecked");
                checkFlag = ((checkFlag.length > 0) || !settings.checkbox) ? true : false;
                if (e.which == 2) {
                    settings.onFiMidClick(e, checkFlag, tag);
                } else if (e.which == 3) {
                    settings.onFiContextMenu(e, checkFlag, tag);
                }
            });



            $(".carItem").unbind().live("dblclick", function () {
                var cardomObj = $(this);
                var tag = this.id.toString().split("_")[0];
                var checkFlag = $(cardomObj).find(".carChecked");
                checkFlag = ((checkFlag.length > 0) || !settings.checkbox) ? true : false;
                settings.onFiDblClick(checkFlag, tag);
            })



            //文件的选中和不选中
            $(".carNoChecked,.carChecked").unbind().live("click", function (event) {
                event.stopPropagation(); //阻止事件冒泡
                theCommonValue.isChkFlag = true;
                var domObj = this;
                var theBroDom = $(domObj).parent().parent();
                var CarTag = $($(theBroDom).find(".terminalTag")).html();  //获取车辆编号
                var orgTag = $($(theBroDom).find(".orgtag")).html();        //获取组织编号
                var checkFlag = $(domObj).hasClass("carChecked");

                var selectTerminals = [];
                selectTerminals.push(CarTag);

                if (checkFlag) { //如果当前状态是选中的,则取消选中
                    $(domObj).removeClass("carChecked").addClass("carNoChecked");
                } else {        //如果之前是没有选中，则修改为选中状态。
                    $(domObj).removeClass("carNoChecked").addClass("carChecked");
                }
                //=========================================
                settings.onFiCheck(checkFlag, selectTerminals);
                commonFun.checkCarCheckStatus(orgTag);
                commonFun.uncheckParent(orgTag, checkFlag);
            })

            //文件的选中和不选中
            $(".carNoChecked,.carChecked").unbind().live("dblclick", function (event) {
                event.stopPropagation(); //阻止事件冒泡
            })

        }
    }




    //定义方法对象。
    var methods = {
        init: function (options) {
            if (options) {
                $.extend(settings, options);
            }
            if (settings.foUrl != "") {
                $.ajax({
                    url: settings.foUrl,
                    type: "get",
                    dataType: "jsonp",
                    data: {},
                    success: function (data) {
                        alert(data);
                        if (data != "") {
                            var foData = eval("(" + data + ")");
                            methods.loadFoData(foData, this);
                        }
                    }
                });
            }

            //如果是有组织数据初始化
            if (settings.foData.length > 0) {
                methods.loadFoData(settings.foData, this);
            }
        },
        /*
        * 首先加载文件夹的数据
        */
        loadFoData: function (data, treeObj) {
            var theMikeTreeHtml = "";
            var checkCss = settings.checked ? "orgChecked" : "orgNoCheck";

            var hh = "";

            theCommonValue.theFoIdArrary.length = 0;
            if (settings.treeDataType == "fc") { //如果是fc结构类型的树数据。
                fcFoo(data);
            } else if (settings.treeDataType == "ip") {
                ipLoad(data);
            }


            //===========================
            //ip结构的树渲染.多叉树的生成。id/pid 可能是无序的，必须要找根节点。
            function ipLoad(data) {
                //先找到根节点、然后再根据根节点进行递归。
                var tmpData = data.concat();
                var theRoot = [];
                for (var i = 0; i < tmpData.length; i++) {
                    for (var j = 0; j < tmpData.length; j++) {
                        var idata = tmpData[i];
                        var jdata = tmpData[j];
                        if (idata.pid == jdata.id) break;  //如果找到一个当前i的子节点，则说明不是根节点
                        if (j == tmpData.length - 1) {    //如果找到最后还没找到，则说明是根节点。
                            theRoot.push(idata);
                        }
                    }
                }

                //对各个根节点进行递归渲染.
                $(theRoot).each(function () {
                    renderANode(this);
                    var theId = this.id;
                    ipFoo(data, theId);
                    theMikeTreeHtml += '</div></div>';
                })
            }


            function ipFoo(ipData, pid) {
                //首先对数据处理，进行归类。
                for (var i = 0; i < ipData.length; i++) {
                    if (ipData[i].pid == pid) {
                        renderANode(ipData[i]);
                        ipFoo(ipData, ipData[i].id);
                        ipData.splice(i, 1);
                        theMikeTreeHtml += '</div></div>';
                    }
                }
            }

            //============================
            //fc结构的树渲染，先序遍历生成树
            function fcFoo(data) {
                $(data).each(function () {
                    renderANode(this);
                    if (this.children.length > 0) {
                        fcFoo(this.children);
                    }
                    theMikeTreeHtml += '</div></div>';
                });
            }

            //============================
            //渲染一个节点。
            function renderANode(data) {
                theCommonValue.theFoIdArrary.push(data.id);
                theCommonValue.loadCount = theCommonValue.theFoIdArrary.length;
                theMikeTreeHtml += '<div class="orgFrm"><div class="orgName" id="d' + data.id + '">';
                if (settings.checkbox) theMikeTreeHtml += '<div class="orgChkboxShow ' + checkCss + '"></div>';
                theMikeTreeHtml += data.text + '</div><div class="carFrm" id="d' + data.id + 'Car">';
            }

            var treeDom = treeObj !== undefined ? treeObj : this;
            treeDom.html(theMikeTreeHtml);

            if (settings.expandFo) {
                var orgDom = $(".orgName");
                $(orgDom).each(function () {
                    var theId = this.id;
                    $("#" + theId + "Car").toggle();
                    $(this).toggleClass("orgNameSelect");
                })

                if (!settings.expandFi) {
                    var orgDom = $(".orgName");
                    for (var i = 1; i < orgDom.length; i++) {
                        var theId = orgDom[i].id;
                        $("#" + theId + "Car").toggle();
                        $(orgDom[i]).toggleClass("orgNameSelect");

                    }
                }

            }




            bindEvent.bindFoEvent();
        },
        /*
        * 然后加载文件的数据
        */
        loadFiData: function (foId, data) {
            var aOrgCarsHtml = "";
            var checkCss = settings.checked ? "carChecked" : "carNoChecked";
            theCommonValue.loadCount--;
            $(data).each(function () {
                var posId = Date.parse(new Date());
                var iconCss = settings.iconField != "" ? this[settings.iconField] : settings.icon;
                aOrgCarsHtml += '<div class="carItem" id="' + this[settings.idField] + '_Car">' +
                        '<div class="carItemFrm">' +
                       '<div class="carIcon ' + iconCss + '"></div>' +
                        '<div class="carContent">' +
                        '<span class="hideDiv orgtag" >' + this[settings.foIdField] + '</span><span class="hideDiv terminalTag">' + this[settings.idField] + "</span>" +
                        '<div class="carFont">';
                if (settings.checkbox) aOrgCarsHtml += ' <div class="carChkboxShow ' + checkCss + '"></div>'
                aOrgCarsHtml += '<span class="textField">' + this[settings.text1Field] + "</span>";
                if (settings.showHide) aOrgCarsHtml += '<font style="color:#aaa">(<span class="hideField">' + this[settings.text2Field] + '</span>)</font>';
                aOrgCarsHtml += '</div>' + '</div></div></div>';
            })
            $("#d" + foId + "Car").append(aOrgCarsHtml);
            if (theCommonValue.loadCount == 0) bindEvent.bindFiEvent();
        },
        select: function (tag) {
            if (settings.singleSelect) $(".carItem").removeClass("carItemSelected");
            var cardom = $("#" + tag + "_Car");
            cardom.addClass("carItemSelected");
            var carlistDom = $("#theCarList");
            var orgtag = cardom.find(".orgtag").html();
            openParentOrg("d" + orgtag);
            //将树选中的节点滚动到可视范围内。
            commonFun.scrollerToView(cardom);
        },
        unSelect: function (tag) {
            var cardom = $("#" + tag + "_Car");
            cardom.removeClass("carItemSelected");
        },
        unSelectAll: function () {
            $(".carItem").removeClass("carItemSelected");
        },
        getSelectedFi: function () {
            var selectCarDom = $(".carItemSelected");
            var selectedNodeObj = [];
            $(selectCarDom).each(function () {
                var domObj = this;
                var nodes = commonFun.getNodeData(domObj, domObj);
                selectedNodeObj.push(nodes);
            })
            return selectedNodeObj;
        },
        getCheckedFi: function () {
            var checkedDom = $(".carChecked");
            var checkedTerminals = [];
            var checkedNodeObj = [];
            $(checkedDom).each(function () {
                var domObj = this;
                var theBroDom = $(domObj).parent().parent();
                var nodes = commonFun.getNodeData(domObj, theBroDom);
                checkedNodeObj.push(nodes);
            });
            return checkedNodeObj;
        },
        checkFi: function (tag) {
            var domObj = $("#" + tag + "_Car .carChkboxShow");
            $(domObj).removeClass("carNoChecked").addClass("carChecked");
            var orgtag = $("#" + tag + "_Car .orgtag").html();
            commonFun.checkCarCheckStatus(orgtag);
            commonFun.uncheckParent(orgtag, true);

        },
        unCheckFi: function (tag) {
            var domObj = $("#" + tag + "_Car .carChkboxShow");
            $(domObj).removeClass("carChecked").addClass("carNoChecked");
            var orgtag = $("#" + tag + "_Car .orgtag").html();
            commonFun.checkCarCheckStatus(orgtag);
            commonFun.uncheckParent(orgtag, false);
        },
        checkAll: function () {
            var domObj = $(".carChkboxShow");
            $(".orgChkboxShow").removeClass().addClass("orgChkboxShow orgChecked");
            $(domObj).each(function () {
                $(this).removeClass("carNoChecked").addClass("carChecked");
            })
        },
        expandTo: function (tag) {  //展开传入子节点id所在的组织
            var orgtag = $($("#" + tag + "_Car")).find(".orgtag").html();
            var orgDom = $("#d" + orgtag);
            if (!$(orgDom).hasClass("orgNameSelect")) {
                $("#d" + orgtag + "Car").toggle();
                $(orgDom).toggleClass("orgNameSelect");
            }
        },
        foldFo: function (tag) {    //折叠传入子节点id所在的组织
            var orgtag = $($("#" + tag + "_Car")).find(".orgtag").html();
            var orgDom = $("#d" + orgtag);
            if ($(orgDom).hasClass("orgNameSelect")) {
                $("#d" + orgtag + "Car").toggle();
                $(orgDom).toggleClass("orgNameSelect");
            }
        },
        foldAll: function () {  //折叠所有
            var orgDom = $(".orgName");
            $(orgDom).each(function () {
                var theId = this.id;
                if ($(this).hasClass("orgNameSelect")) {
                    $("#" + theId + "Car").toggle();
                    $(this).toggleClass("orgNameSelect");
                }
            })
        },
        uncheckAll: function () {
            var domObj = $(".carChkboxShow");
            $(".orgChkboxShow").removeClass().addClass("orgChkboxShow orgNoCheck");
            $(domObj).each(function () {
                $(this).removeClass("carChecked").addClass("carNoChecked");
            })
        },
        updateFi: function (id, icon, text, hideText) {
            if (icon !== undefined) {
                var theDom = $("#" + id + "_Car .carIcon");
                $(theDom).removeClass().addClass("carIcon " + icon);
            }
            if (text !== undefined) $("#" + id + "_Car .textField").html(text);
            if (hideText !== undefined) $("#" + id + "_Car .hideField").html(hideText);
        },
        fuzzyQuery: function (text, hilight, byType) { //默认是按节点名称，可以指定为节点id，或者隐藏字段
            var matchIds = [];
            var matchNodes = [];
            $(".carItem").removeClass("match");
            if (byType === undefined || byType == "hideFi") {
                var textFiDom;
                textFiDom = byType == "hideFi" ? $(".hideField") : $(".textField");
                $(textFiDom).each(function () {
                    if ($(this).html().indexOf(text) != -1) {
                        var theBroDom = $(this).parent().parent();
                        if (byType == "hideFi") theBroDom = $(theBroDom).parent();
                        var CarTag = $($(theBroDom).find(".terminalTag")).html();  //获取车辆编号
                        var nodes = commonFun.getNodeData($(theBroDom).parent().parent(), theBroDom);
                        matchNodes.push(nodes);
                        hilightMatch(CarTag);
                    }
                })
            } else if (byType == "id") {
                var textFiDom = $("#" + text + "_Car");
                // matchIds.push(text);
                matchNodes.push(commonFun.getNodeData(textFiDom));
            }

            function hilightMatch(carTag) {
                if (hilight !== undefined && hilight) $("#" + carTag + "_Car").addClass("match");
            }
            return matchNodes;
        },
        clearMath: function () {
            $(".carItem").removeClass("match");
        },
        getFoIds: function () {
            return theCommonValue.theFoIdArrary;
        },
        clearFoIds: function () {
            theCommonValue.theFoIdArrary.length = 0;
        }
    };

    //=====================================
    //插件
    $.fn.mTree = function (method) {
        if (methods[method]) {
            return methods[method].apply(this,
             Array.prototype.slice.call(arguments, 1)
          );
        } else if (typeof (method === 'object' || !method)) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method' + method + 'does not exist');
        }
    }
})(jQuery)