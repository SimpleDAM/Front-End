/*
This software is released under the BSD-3-Clause License

Copyright 2025 Daydream Interactive Limited

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Page globals
var currentuserid = null;
var perpage = getParameterByName("num",20);
var numrecords = 0;
var page = parseInt(getParameterByName("page",1));
var maxpages = 0;
var maxpagelinks = 11;
/*
var sortpair = getParameterByName("sort","eventid desc");
var sortarray = sortpair.split(" ");
var sortby = sortarray[0];
var dir = sortarray[1];
*/
var sort = getParameterByName("sort","eventid");
var dir = getParameterByName("dir","desc");
var sortpair = sort + " " + dir;

var q = getParameterByName("q","");
//var t = getParameterByName("t","");
var id = getParameterByName("id","");
var userid = getParameterByName("userid","");
var from = getParameterByName("from","");
var to = getParameterByName("to","");
var format = getParameterByName("format","screen");
var sessiontoken = localStorage.sessiontoken;

var url = new URL(window.location);
var t = url.searchParams.getAll("t");

// Default event types to select in filter combo box
var default_types = [1,2,3,5,6,7,8,9,10,11,12,16,17,18,30];
//url = new URL(window.location);

$(document).ready(function(){
	// Check session token on page load and redirect to login if a valid one isn't found
	checkSessionToken().then(
		function(data){
			if (data.error || data.data.userroleid < 2){
				window.location.href = "/";
			} else {
				init(data);
			}
		}
	).fail(function(){
		window.location.href = "/";
	});
	
});

function init(userdata){

	$(".logged-in, .main-container").fadeIn();
	
	// Append logout link with sessiontoken
	$(".logout").attr("href","/api/user/logout/?sessiontoken="+userdata.data.sessiontoken);
	
	$(".isadmin").show();
	
	// Dropdown per page handler
	$("#per_page_select").on("change",function(){
		var num = $(this).val();
		$.cookie('perpage_events', num, { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie })
		window.location.href = "?num="+num;
	});
	
	if ($.cookie('perpage_events')){
		perpage = $.cookie('perpage_events');
	}
	
	$("#per_page_select").val(perpage);	
	
	// Hide/show filters
	$(document).on("click",".toggleSearchFilters",function(){
		$(".searchFilters").toggle(250,function(){
			if ($(".searchFilters").is(':visible')){
				$.removeCookie('hideEventFilters', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
				$(".showFilterSpace").hide();
				$(".toggleSearchFilters").html("Hide Filters [&minus;]");
			} else {
				$.cookie('hideEventFilters', 'true', { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
				$(".showFilterSpace").show();
				$(".toggleSearchFilters").html("Show Filters [+]");
			}
		});
		return false;
	});
	
	// On load, if filters were previously hidden, hide them
	// BUT, if form was explicitly reset re-open the form
	$(document).on("click","#filterReset",function(){	
		$("#eventq").val("");
		$("#t").val("");
		$("#id").val("");
		$("#userid").val("");
		$("#from").val("");
		$("#to").val("");
		$("input[name='format'][value='screen']").prop("checked",true);
		$("#sort").val("eventid");
		$("input[name='dir'][value='desc']").prop("checked",true);
	});
	
	// On load, if filters were previously hidden, hide them
	// BUT, if form was explicitly reset re-open the form
	if (getParameterByName("reset")){
		$.removeCookie('hideViewerFilters', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.removeCookie('eventq', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.removeCookie('t', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		history.pushState('', document.title, window.location.pathname);
	}
	
	// Keyword present in querystring?
	if (getParameterByName("q")){
		$.cookie('eventq', getParameterByName("q"), { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$("#eventq").val(getParameterByName("q"));
	// Else was an empty parameter sent?
	} else if (urlParameterExists("q")){
		$("#eventq").val("");
		$.removeCookie('eventq', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
	// Else does the keyword cookie exist?	
	} else if ($.cookie('eventq')){
		$("#eventq").val($.cookie('eventq'));
	}
	
	q = $("#eventq").val();
	
	// Populate form with previous parameters
	$("#id").val(id);
	$("#userid").val(userid);
	$("#from").val(from);
	$("#to").val(to);
	$("input[name='format'][value=" + format + "]").prop('checked', true);
	$("#sort").val(sort);
	$("input[name='dir'][value=" + dir + "]").prop('checked', true);
	
	if ($.cookie('hideEventFilters')){
		$(".showFilterSpace").show();
		$(".searchFilters").hide();
		$(".toggleSearchFilters").html("Show Filters [+]");
	}
	
    $(function(){
      $(".footer").load("/html/footer.html"); 
    });
	
	$("#from").datepicker({
	  dateFormat: "yy-mm-dd",
	  changeMonth: true,
      changeYear: true
	});
	
	$("#to").datepicker({
	  dateFormat: "yy-mm-dd",
	  changeMonth: true,
      changeYear: true
	});
	
	// Init - this in turn calls getEvents()
	getEventTypes();
}

// Preload thumbnails - if the thumbnail doesn't exist, add in the fallback
var images = [];
var imgurls = [];
function preloadThumbnail(url) {
	var fallback = "/images/no-thumbnail.png";
	var img = new Image();
	img.onload = function(){
		images.push(img);
		imgurls.push(url);
		return true;
	}
	img.onerror = function(){
		if (!in_array(fallback,imgurls)){
			img = new Image();
			img.src = fallback;
			images.push(img);
			imgurls.push(fallback);
		}
		return false;
	}
	img.src = url;
}

function getEventTypes(){

	$.getJSON("/api/eventtype/list/",{sessiontoken:sessiontoken,start:0, limit:100, sort:"eventtypename", dir:"asc"})
	.done(function(json) {
		if (json.error){
			showError(json.description,true);
		} else {		
			var types = json.data.eventtypes;
			// Build the HTML and add to the table
			for(i in types){	
				$("#t").append('<option value="'+types[i].eventtypeid+'">'+types[i].eventtypename+'</option>');
			}
				
			// Event type combo box - set if in querystring or cookie exists
			// Value from form submission
			if (getParameterByName("t")){
				console.log("getParameterByName: " + getParameterByName("t"));
				$("#t").val("");
				$.cookie('t', t, { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
				$.each(t, function(i,e){
					$("#t option[value='" + e + "']").prop("selected", true);
				});
				$("#t").trigger("change");
			// Else was an empty t parameter sent?
			} else if (urlParameterExists("t")){
				console.log("urlParameterExists (reset?)");
				$("#t").val("");
				$.removeCookie('t', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
			// Else does the event type cookie exist?	
			} else if ($.cookie('t')){
				console.log("using cookie value: "+ $.cookie('t') );
				$("#t").val("");
				var ct = $.cookie('t').split(",");
				$.each(ct, function(i,e){
					$("#t option[value='" + e + "']").prop("selected", true);
				});
				$("#t").trigger("change");
			} else {
				console.log("Use defaults (reset or no cookie)");
				// Preselect event type combo box options
				for(i in default_types){
					$("#t option[value='" + default_types[i] + "']").prop("selected", true);
				}
			}
			t = $("#t").val();
			getEvents();
		}
	})
	.fail(function( jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		showError(err,true);
	}); // end getJSON
}

function getEvents(){
	
	$(".error-msg").html("");
	$(".errors").hide();
	
	var start = (page > 1) ? (page - 1) * perpage : 0;
	
	// If output format is of a downloadable type
	if (format == "csv" || format == "json" || format == "apicalls"){
		var params_obj = {sessiontoken:sessiontoken, start:start, limit:perpage, sort:sort, dir:dir, t:t, q:q, id:id, userid:userid, from:from, to:to, format:format};
		var params = decodeURIComponent($.param(params_obj));
		window.location.href = "/api/event/list/?" + params;
		// Change back to show on screen too
		format = "screen";
	}
	
	$.getJSON("/api/event/list/",{sessiontoken:sessiontoken, start:start, limit:perpage, sort:sort, dir:dir, t:t, q:q, id:id, userid:userid, from:from, to:to, format:format})
	.done(function(json) {
		if (json.error){
			showError(json.description,true);
		} else {
			
			$(".event-row").remove();
			var events = json.data.events;
			// Work out pagination
			numrecords = json.data.total;
			maxpages = Math.ceil(numrecords/perpage);
			
			// Prevent pages going out of range
			if (maxpages > 0 && page > maxpages){
				page = maxpages;
				getEvents();
				return false;
			}
			
			$(".numrecords").html(numrecords);
			$(".current-page").html(page);
			$(".max-pages").html(maxpages);			
			buildPagination();
			var html = '';
			// Build the HTML and add to the table
			for(i in events){
				// Collapse metadata section if it exists (only for add/upload/update asset)
				if (events[i].eventtypeid == 12 || events[i].eventtypeid == 15 || events[i].eventtypeid == 16){
					
					// Only proceed if 'Metadata' exists in the event details string
					if (events[i].eventdetails.includes("Metadata")){
						var parts = events[i].eventdetails.split("Metadata: {");
						var before_metadata = parts[0];
						var metadata_substring = events[i].eventdetails.substring(events[i].eventdetails.indexOf("{") + 1, events[i].eventdetails.lastIndexOf("}"));
						var metadata_snippet = metadata_substring.substring(0,20);
						var metadata_json = JSON.parse('{'+metadata_substring+'}');
						var metadata_string = JSON.stringify(metadata_json, null, 2); // spacing level = 2
						var metadata_div = before_metadata + ' <span class="metadata_snippet" id="msnpt_'+events[i].eventid+'">Metadata: {' + metadata_snippet + '</span><a href="#" class="metadata_link" rel="'+events[i].eventid+'">...more</a> <pre class="metadata_wrapper" id="'+events[i].eventid+'" style="display:none;">' + metadata_string + '</pre>';
						events[i].eventdetails = metadata_div;
					}
				}
				//
				var assethtml = "N/A";
				if (events[i].assetid){
					var thumbnail_url = "/api/asset/thumbnail/?sessiontoken="+sessiontoken+"&id="+events[i].assetid;
					preloadThumbnail(thumbnail_url);
					assethtml = '<a class="asset-thumbnail" style="padding:2px;" data-img="'+thumbnail_url+'" href="/admin/edit/?id='+events[i].assetid+'" target="_blank">'+events[i].assetid+'</a>';
				}
				html += '<tr class="event-row"><td>'+events[i].eventid+'</td><td>'+assethtml+'</td><td><a href="/account?userid='+events[i].userid+'">'+events[i].firstname+' '+events[i].lastname+'</a></td><td>'+events[i].eventtypename+'</td><td>'+events[i].eventdetails+'</td><td>'+events[i].apiurl+'</td><td>'+events[i].apimethod+'</td><td>'+events[i].eventdate+'</td></tr>';
			}
			$(".auditTable tbody").append(html);
			dir = (dir == "asc") ? "desc" : "asc";
			$(".sort").attr("data-dir",dir);
			
			// Show preview popover on thumbnail hover
			/*
			$(".assetThumbnail").tooltip({
				container:"body",
				placement: "top"
			});
			*/
			$('.asset-thumbnail').popover({
				html: true,
				trigger: 'hover',
				placement: 'top',
				content: function () {
					if (in_array($(this).data('img'),imgurls)){
						return '<img src="' + $(this).data('img') + '"  class="img-fluid"/>';
					}
					return '<img src="/images/no-thumbnail.png"  class="img-fluid"/>';
				}
			});
			
		}
		
		$(document).on("click",".metadata_link",function(){
			var eventid = $(this).attr("rel");
			var el = $(".metadata_wrapper[id="+eventid+"]");
			if (el.is(":visible")){
				el.hide();
				$("#msnpt_"+eventid).show();
				$(this).text("...more");
			} else {
				el.show();
				$("#msnpt_"+eventid).hide();
				$(this).text("...less");
			}
			return false;
		});
		
	})
	.fail(function( jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		showError(err,true);
	}); // end getJSON
}