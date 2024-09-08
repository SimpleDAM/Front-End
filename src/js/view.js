/*
This software is released under the BSD-3-Clause License

Copyright 2022 Daydream Interactive Limited

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Page globals
var currentassetid = null;
var perpage = getParameterByName("num",20);
var numrecords = 0;
var page = getParameterByName("page",1);
var maxpages = 0;
var maxpagelinks = 11;
var sortpair = getParameterByName("sort","assetid desc");
var sortarray = sortpair.split(" ");
var sortby = sortarray[0];
var dir = sortarray[1];
var q = getParameterByName("q","");
var sessiontoken = localStorage.sessiontoken;
var asset_cache = new Array();
var grid = true;
var userdata;

// Check session token on page load and redirect to login if a valid one isn't found
$(document).ready(function(){
	checkSessionToken().then(
		function(data){
			if (data.error){
				window.location.href = "/";
			} else {
				userdata = data;
				init(data);
			}
		}
	).fail(function(){
		window.location.href = "/";
	});
});

function init(userdata){
	// Show main wrapper
	$(".logged-in, .main-container").show();
	
	// Show admin sections
	if (userdata.data.userroleid == 2){
		$(".isadmin").show();
	}
	
	$(".sessiontoken").val(sessiontoken);
	
	// Append logout link with sessiontoken
	$(".logout").attr("href","/api/user/logout/?sessiontoken="+userdata.data.sessiontoken);
	
	// Bootstrap popover for asset preview
	$('[rel=popover]').popover({
		container:"body",
		placement: function(){
			return "top";
		},
		trigger: "hover"
	});	

	// Dropdown per page handler
	$("#per_page_select").on("change",function(){
		var num = $(this).val();
		$.cookie('perpage_assets', num, { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		window.location.href = "?num="+num;
	});
	
	$(document).on("click",".sort",function(){
		sortby = $(this).attr("data-sortby");
		dir = $(this).attr("data-dir");
		$.cookie('sortby_assets', sortby, { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.cookie('sortdir_assets', dir, { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		getAssets(userdata);
		return false;
	});
	// On load
	if ($.cookie('sortby_assets') && $.cookie('sortdir_assets')){
		sortby = $.cookie('sortby_assets');
		dir = $.cookie('sortdir_assets');
	}
	
	// Pagination
	if ($.cookie('perpage_assets')){
		perpage = $.cookie('perpage_assets');
	}
	$("#per_page_select").val(perpage);
	
	// Hide/show filters
	$(".toggleSearchFilters").on("click",function(){
		console.log("Toggle filters");
		$(".searchFilters").toggle(250,function(){
			if ($(".searchFilters").is(':visible')){
				$.removeCookie('hideViewerFilters', {path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
				$(".toggleSearchFilters").html("Hide Filters [&minus;]");
			} else {
				$.cookie('hideViewerFilters', 'true', { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
				$(".toggleSearchFilters").html("Show Filters [+]");
			}
		});
		return false;
	});
	
	$("#filterReset").on("click",function(){	
		$("#q").val("");
	});
	// On load, if filters were previously hidden, hide them
	// BUT, if form was explicitly reset re-open the form
	if (getParameterByName("reset")){
		$.removeCookie('hideViewerFilters', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.removeCookie('q', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.removeCookie('sortby_assets', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.removeCookie('sortdir_assets', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		sortby = "assetid";
		dir = "desc";
		// Remove queries from address bar/URL
		history.pushState('', document.title, window.location.pathname);
	}
	
	// Keyword present in querystring?
	if (getParameterByName("q")){
		$.cookie('q', getParameterByName("q"), { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$("#q").val(getParameterByName("q"));
	// Else was an empty parameter sent?
	} else if (urlParameterExists("q")){
		$("#q").val("");
		$.removeCookie('q', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
	// Else does the keyword cookie exist?	
	} else if ($.cookie('q')){
		$("#q").val($.cookie('q'));
	}
	// For getAssets call parameter
	q = $("#q").val();
	
	if ($.cookie('hideViewerFilters')){
		$(".searchFilters").hide();
		$(".toggleSearchFilters").html("Show Filters [+]");
	}
	
	// Asset Pop-Up Handler
	$(document).on("click",".assetThumbnail",function(){	
		$(".thumbnail").removeClass("thumbnail-selected");
		$(this).parent().addClass("thumbnail-selected");
		var assetid = $(this).attr("data-assetid");
		currentassetid = assetid;
		updateAssetDetails(assetid);
		return false;
	});
	
	// Pause any audio or video when the asset modal popup is closed 
	$('#assetModal').on('hidden.bs.modal', function (event) {
		if ($("#audio-player").length){
			var sound = $("#audio-player")[0]; 
			sound.pause();
		}
		if ($("#video-player").length){
			var video = $("#video-player")[0];
			video.pause();
		}
	});
	
	$(document).on("click",".hidePopUp",function(){
		$(".assetPopUp").fadeOut(100);
		return false;
	});
	
	// Switch between grid and list view
	$(document).on("click",".btn-grid",function(){
		if (grid){
			return false;
		}
		$(".btn-list").removeClass("active");
		$(this).addClass("active");
		$(".assetContainer").each(function(){
			$(this).removeClass("listmode");
			$(this).find(".list-filename").remove();
			$(this).find(".ext-div").remove();
		});
		grid = true;
		$.removeCookie('list', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		return false;
	});
	
	// List view
	$(document).on("click",".btn-list",function(){
		if (!grid){
			return false;
		}
		listView();
	});
	
	// Zoom/Preview function
	$(".assetPreview").on({
		mouseenter: function () {
			var $this = $(this);
			var assetid = $this.attr("data-assetid");
			var data = asset_cache[assetid];
			// Stuff to do on mouse enter
			var mimetype = data.metadata.mimetype;
			var extension = data.metadata.extension;
			var type = "image"; // default
			if (mimetype){
				type = mimetype.split("/")[0];
			}
			if (type == "image" && in_array(extension,embedtypes)){
				$(".assetPreview img").show();
				$(".assetPreview img").attr("src",data.embedurl);
				$(".assetPreview img").css("max-width",data.metadata.fullwidth+"px");
				$(".assetPreview img").css("max-height",data.metadata.fullheight+"px");
			}
			return false;
		},
		mouseleave: function () {
			var $this = $(this);
			var assetid = $this.attr("data-assetid");
			var data = asset_cache[assetid];
			// Stuff to do on mouse enter
			var mimetype = data.metadata.mimetype;
			var extension = data.metadata.extension;
			var type = "image";
			if (mimetype){
				type = mimetype.split("/")[0];
			}
			// Stuff to do on mouse leave	
			if (type == "image" && in_array(extension,embedtypes)){	
				//$(".assetPreview").css("background-image","url(/images/preview-loading.gif)");
				$(".assetPreview img").attr("src",$this.attr("data-previewurl"));	
				$(".assetPreview img").css("max-width",data.metadata.previewwidth+"px");
				$(".assetPreview img").css("max-height",data.metadata.previewheight+"px");
				$(".assetPreview img").css("margin-left",0);
				$(".assetPreview img").css("margin-top",0);
				$(".assetPreview img").show();
			}
			return false;
		},
		mousemove: function (e) {
			var $this = $(this);
			// Stuff to do on mouse enter
			var assetid = $this.attr("data-assetid");
			var data = asset_cache[assetid];
			
			var url = data.embedurl;
			var mimetype = data.metadata.mimetype;
			var extension = data.metadata.extension;
			var type = "image";
			if (mimetype){
				type = mimetype.split("/")[0];
			}
			// Stuff to do on mouse move
			if (type == "image" && in_array(extension,embedtypes)){
				var parentOffset = $this.parent().offset();
				var relX = Math.round(e.pageX - parentOffset.left,0);
				var relY = Math.round(e.pageY - parentOffset.top,0);
				
				var fw = data.metadata.fullwidth;
				var fh = data.metadata.fullheight;
				var w = data.metadata.previewwidth;
				var h = data.metadata.previewheight;
	
				$(".assetPreview img").css("margin-left",( (relX + 60) - (fw/350) * relX) );
				$(".assetPreview img").css("margin-top",( relY - (fh/350) * relY) );
			}			
			return false;
		}
	});
	
	// Previous and next record click handlers
	$(document).on("click",".prevRecord",function(){
		$("#audio-player, #video-player").remove();
		var el = $(".assetThumbnail[data-assetid="+currentassetid+"]");
		var index = $(".assetThumbnail").index(el);
		var prevassetid = $(".assetThumbnail").eq(index-1).attr("data-assetid");
		updateAssetDetails(prevassetid);
		return false;
	});
	
	$(document).on("click",".nextRecord",function(){
		$("#audio-player, #video-player").remove();
		var el = $(".assetThumbnail[data-assetid="+currentassetid+"]");
		var index = $(".assetThumbnail").index(el);
		var nextassetid = $(".assetThumbnail").eq(index+1).attr("data-assetid");
		updateAssetDetails(nextassetid);
		return false;
	});
	
	$(function(){
		$(".footer").load("/html/footer.html"); 
    });
	
	$(document).on("click",".popover",function(){
		$(this).popover('hide');
	});
	
	$(document).on("click",".assetDelete",function(){
		var assetid = $(this).attr("rel");
		var answer = confirm("This will delete the asset. Are you sure?");
		if (answer){
			deleteAsset(assetid);
		}
		return false;
	});
	
	// Init
	getAssets(userdata);
}

function deleteAsset(id){
	
	$.ajax({
			type: "POST",
			url: "/api/asset/delete",
			data: {sessiontoken:sessiontoken,id:id},
			dataType: "json",
			encode: true,
		}).done(function (data) {
			if (data.error){
				showError(data.description);
			} else {
				showSuccess('The asset was successfully deleted.',true);
				getAssets(userdata);
			}
		}).fail(function( jqxhr, textStatus, error ) {
			var err = error;
			showError(err);
		});
}

// Apply list view to thumbnails
function listView(){
	$(".btn-grid").removeClass("active");
	$(".btn-list").addClass("active");
	$(".assetContainer").each(function(){
		$(this).addClass("listmode");
		$(this).find(".caption").append('<div class="list-filename">'+$(this).find(".assetThumbnail").attr("data-filename")+'</div>');
		var ext = $(this).find(".assetThumbnail").attr("data-extension");
		$(this).find(".caption").prepend('<div class="pull-right ext-div"><img class="ext-icon" src="/images/ext/'+ext+'.png"></div>');
		
	});
	$.cookie('list', true, { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
	grid = false;
}

// Update popup screen details - this is now passed an assetid from the thumbnail DOM element
function updateAssetDetails(assetid){
	// Remove any previous preview controls
	$("#audio-player, #video-player").remove();
	$(".assetZoomHint").hide();
	// Get from the asset cache
	var data = asset_cache[assetid];
	var el = $(".assetThumbnail[data-assetid='"+assetid+"']");
	
	// When skipping through if we're out of range
	if (el.length){
		currentassetid = assetid;
	} else {
		el = $(".assetThumbnail").eq( $(".assetThumbnail").index( 0 ) );
		currentassetid = $(el).attr("data-assetid");
		data = asset_cache[currentassetid];
	}

	$(".thumbnail").removeClass("thumbnail-selected");
	$(el).parent().addClass("thumbnail-selected");
	
	var metadata = data.metadata;
	// Deal with mime type and decide what to show in the preview pane
	var mimetype = metadata.mimetype;
	var extension = metadata.extension;
	var previewurl = data.previewurl;
	var embedurl = data.embedurl;
	var type = "image";
	if (mimetype !== null){
		type = mimetype.split("/")[0];
	}
	if (type == "audio"){
		if ($("#audio-player").length == 0){
			$(".assetPreview img").hide();
			$(".assetPreview").css("background-image","none");
			$(".assetPreview").append('<audio id="audio-player" controls="controls" src="'+embedurl+'" type="'+mimetype+'">');
		}
	} else if (type == "video"){
		if ($("#video-player").length == 0){
			$(".assetPreview img").hide();
			$(".assetPreview").css("background-image","none");
			$(".assetPreview").append('<video width="350" height="262" id="video-player" controls="controls" src="'+embedurl+'" type="'+mimetype+'">');
		}
	} else if (type == "image" && extension !== null){
		$(".assetZoomHint").show();
		$(".assetPreview").html('<img src="'+previewurl+'" />');
		$(".assetPreview img").css("max-width",metadata.fullwidth+"px");
		$(".assetPreview img").css("max-height",metadata.fullheight+"px");
		$(".assetPreview img").show();
		$(".tr-dimensions").show();
	} else {
		$(".assetPreview").html('<img src="'+previewurl+'" />');
		$(".assetPreview img").css("max-width",metadata.fullwidth+"px");
		$(".assetPreview img").css("max-height",metadata.fullheight+"px");
		$(".assetPreview img").show();
	}
	
	// Now update the text fields and other controls
	
	// Modal pop-up links
	$("#assetModal .assetDownloadLink").attr("href","/api/asset/download/?sessiontoken="+sessiontoken+"&id="+assetid);
	$("#assetModal .assetPageLink").attr("href","/asset/?id="+assetid);
	$("#assetModal .assetUpdate").attr("href","/admin/edit/?id="+assetid);
	$("#assetModal .assetDelete").attr("rel",assetid);
	
	// We need to pass through the mime type for when we attempt to embed images, audio, video etc.
	$(".assetPreview").attr("data-assetid",assetid);
	$(".assetPreview").attr("data-extension",metadata.extension);
	$(".assetPreview").attr("data-mimetype",metadata.mimetype);
	$(".assetPreview").attr("data-embedurl",embedurl);
	$(".assetPreview").attr("data-previewurl",previewurl);
	$(".assetPreview").attr("data-previewwidth",metadata.previewwidth);
	$(".assetPreview").attr("data-previewheight",metadata.previewheight);
	
	if (metadata.fullwidth == null || metadata.fullheight == null){
		$(".tr-dimensions").hide();
	}
	
	$(".assetPreview").attr("data-fullwidth",metadata.fullwidth);
	$(".assetPreview").attr("data-fullheight",metadata.fullheight);
	
	// Iterate through our data/metadata objects and programatically populate corresponding fields via their data-X attribute 
	// Clear down first
	$("[data-field]").html('');
	
	for (i in data){
	
		if (data[i] === true){
			data[i] = "true";
		}
		if (data[i] === false){
			data[i] = "false";
		}
		
		$("*[data-field='"+i+"']").html(data[i]);
	}
	
	for (i in metadata){
	
		if (metadata[i] === true){
			metadata[i] = "true";
		}
		if (metadata[i] === false){
			metadata[i] = "false";
		}
		
		$("*[data-field='"+i+"']").html(metadata[i]);
	}	
	
	// If metadata-only asset, show filename as 'none' instead of null
	if (metadata.filename == null){
		$("*[data-field='filename']").html("No File");
		$("*[data-field='mimetype']").html("N/A");
	}
	
	// Populate other fields
	$("*[data-field='filesize']").html(formatBytes(metadata.filesize,2));
	$("*[data-field='description']").html(metadata.extensions.simpledam.description);
	$("*[data-field='views']").html(metadata.extensions.simpledam.views);
	$("*[data-field='downloads']").html(metadata.extensions.simpledam.downloads);
	$("*[data-field='uploader']").html(metadata.extensions.simpledam.uploader);
	$("*[data-field='metadata']").html("<pre class='json'>" + JSON.stringify(metadata,null,2) + "</pre>");
	
}

// Get list of assets from API
function getAssets(userdata){

	$(".errors").hide();

	var start = (page > 1) ? (page - 1) * perpage : 0;
	
	$.getJSON("/api/asset/list/",{sessiontoken:sessiontoken,start:start, limit:perpage, sort:sortby, dir:dir, q:q})
	.done(function(json) {
		if (json.error){
			showError(json.description,true);
		} else {
			var html = '';
			var assets = json.data.assets;
			
			// Work out pagination
			numrecords = json.data.total;
			
			// If no records, hide certain elements
			if (numrecords < 1){
				$(".pagination, .perPageSelect").hide();
			}
			maxpages = Math.ceil(numrecords/perpage);		
				
			// Prevent pages going out of range
			if (maxpages > 0 && page > maxpages){
				page = maxpages;
				getAssets();
				return false;
			}	
			// Show on-screen
			$(".numrecords").html(numrecords);
			$(".current-page").html(page);
			$(".max-pages").html(maxpages);
			
			// Call the function that displays the page links (in global.js)
			buildPagination();
			
			// Enumerate API response and add thumbnail DOM elements
			for(i in assets){
			
				// Add to cache, with assetid as index/key
				var assetid = assets[i].assetid;
				asset_cache[assetid] = assets[i];

				// Get extension and embed in data attribute
				var extension = assets[i].metadata.extension;
				
				if (in_array(extension,previewtypes)){
					var preview_url = "/api/asset/preview/?sessiontoken="+sessiontoken+"&id="+assetid;
					var thumbnail_url = "/api/asset/thumbnail/?sessiontoken="+sessiontoken+"&id="+assetid;
				} else {
					var preview_url = "/images/no-preview.png";
					var thumbnail_url = "/images/no-thumbnail.png";
				}
				var embed_url = "/api/asset/embed/?sessiontoken="+sessiontoken+"&id="+assets[i].assetid;
				var asset_url = "/asset/?id="+assets[i].assetid;
				var download_url = "/api/asset/download/?sessiontoken="+sessiontoken+"&id="+assets[i].assetid;
				
				// Add to cache
				asset_cache[assetid].thumbnailurl = thumbnail_url;
				asset_cache[assetid].previewurl = preview_url;
				asset_cache[assetid].embedurl = embed_url;
				
				// If metadata-only asset, show filename as 'none' instead of null
				var filename = (assets[i].metadata.filename == null) ? "No File": assets[i].metadata.filename;
				
				// Build thumbnails
				html += '<div class="assetContainer col-md-2 col-sm-3 col-xs-4 text-center"><div class="thumbnail"><a class="assetThumbnail" data-assetid="'+assetid+'" data-filename="'+filename+'" href="#" data-extension="'+extension+'" data-toggle="modal" data-target="#assetModal" rel="popover" data-trigger="hover" data-content="<div class=\'popoverPreview\'><img align=\'center\' src=\''+preview_url+'\' width=\''+assets[i].metadata.previewwidth+'\' height=\''+assets[i].metadata.previewheight+'\' /><div class=\'popover-text\'><div class=\'popover-description\'><strong>Description:</strong> '+assets[i].metadata.extensions.simpledam.description+'</div><div class=\'popover-description\'><strong>Filename:</strong> '+filename+'</div><strong>Asset ID:</strong> '+assetid+'<br><strong>Uploader:</strong> '+assets[i].metadata.extensions.simpledam.uploader+'<br><br><p align=\'center\'><strong>Click to view full details</strong></p>" data-placement="top" data-original-title="" data-html="true"><img src="'+thumbnail_url+'" alt=""></a><div class="caption"><span>'+assets[i].metadata.extensions.simpledam.description+'</span></div><div class="btn-group text-center"><a class="btn btn-xs btn-primary assetPageLink" href="'+asset_url+'" target="_blank" title="Asset Page"><i class="glyphicon glyphicon-file"></i></a><a class="btn btn-xs btn-default assetUpdate isadmin" style="display:none;" href="/admin/edit/?id='+assetid+'" title="Edit Asset"><i class="glyphicon glyphicon-pencil"></i></a><a class="btn btn-xs btn-danger assetDelete isadmin" style="display:none;" rel="'+assetid+'" href="#" title="Delete Asset"><i class="glyphicon glyphicon-trash"></i></a><a class="btn btn-xs btn-success assetDownloadLink" href="'+download_url+'" target="_blank" title="Download Asset"><i class="glyphicon glyphicon-download-alt"></i></a></div></div></div>';
			}
			// And add to the container DOM
			$(".assetsWrapper").html(html);
			
			if ($.cookie('list')){
				listView();
			}
			
			// Show preview popover on thumbnail hover
			$(".assetThumbnail").popover({
				container:"body",
				placement: function(context, source){
					// Attempt to keep the popover within the browser's viewport
					var popover_offset = $(source)[0].getBoundingClientRect().top;
					var popover_offset_right = $(window).width() - ($(source)[0].getBoundingClientRect().right  + $(window)['scrollLeft']());
					if (popover_offset < 522 && popover_offset_right < 400){
						return "left";
					}
					if (popover_offset < 522) {
						return "right";
					}
					return "top";
				},
				trigger: "hover"
			});

			// Show admin sections
			if (userdata.data.userroleid == 2){
				$(".isadmin").show();
			}
			
			// Add active class to current sorting link
			$(".sort").parent().removeClass("active");
			$(".sort[data-sortby='"+sortby+"'][data-dir='"+dir+"']").parent().addClass("active");

		}
	})
	.fail(function( jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		showError("The assets could not be retrieved at this time. Please try again later.",true);
	}); // end getJSON
}