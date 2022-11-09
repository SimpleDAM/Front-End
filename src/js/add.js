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
var sessiontoken = localStorage.sessiontoken;

// Check session token on page load and redirect to login if a valid one isn't found
$(document).ready(function(){
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


function init(userdata) {

	$(".logged-in").show();
	$(".main-container").show();
	$(".isadmin").show();
	$(".sessiontoken").val(sessiontoken);
	$(".asset-container").show();
	
	// Append logout link with sessiontoken
	$(".logout").attr("href","/api/user/logout/?sessiontoken="+userdata.data.sessiontoken);
	
	$(function(){
      $(".footer").load("/html/footer.html"); 
    });
	
		
	$(".btn-add-submit").on("mousedown",function () {
		if ( $('#add-file').get(0).files.length > 0){
			$("#assetAddForm").attr("action","/api/asset/upload")
		} else if ( $('#add-url').val() ) {
			$("#assetAddForm").attr("action","/api/asset/upload");
		} else {
			$("#assetAddForm").attr("action","/api/asset/add");
		}
	});
	
	// Check if input URL is valid in add asset form
	$(document).on("keyup","#add-url",function(){
		var addurl = $(this).val();
		if (addurl != "" && !isValidUrl(addurl)){
			$(this).addClass('json-bad');
		} else {
			$(this).removeClass('json-bad');
		}
	});
	
	// JSON validation
	$(document).on("keyup focus","#add-metadata",function(){
		var json = $(this).val();
		var popover = $(this).data('bs.popover');
		$(this).removeClass('json-bad');
		if (json == ""){
			$(this).popover('hide');
			return;
		} else if (isJsonString(json)){
			$(this).removeClass('json-bad');
			if (popover){	
				popover.options.content = "JSON is Valid";	
			} else {
				$(this).popover({content:"JSON is Valid",trigger:"manual",placement:"bottom"});
			}
		} else {
			$(this).addClass('json-bad');
			if (popover){
				popover.options.content = "JSON is NOT Valid";
			} else {
				$(this).popover({content:"JSON is NOT Valid",trigger:"manual",placement:"bottom"});
			}
		}	
		$(this).popover('show');
	});
	
	$(document).on("blur","#add-metadata",function(){
		var el = $(this).popover('hide');
	});
	
	// Add asset form
	$("#assetAddForm").on("submit",function () {
		
		var answer = confirm("This will create a new asset. Are you sure?");
		if (!answer){
			return false;
		}
	
		$(".alert-add-error").hide();
		$(".alert-add-success").hide();

		var form = $('#assetAddForm')[0];
		var formData = new FormData(form);
		
		$.ajax({
			type: "POST",
			url: $(this).prop("action"),
			data: formData,
			processData: false,
            contentType: false,
			dataType: "json",
			encode: true,
		}).done(function (json) {
			if (json.error){
				showError(json.description,true);
			} else {
				showSuccess("The asset was successfully created. <a href='/asset/?id="+json.data.assetid+"'>View</a> or <a href='/admin/edit/?id="+json.data.assetid+"'>Edit</a> the asset, or <a href='/view'>Return to assets</a>.",true);
			}
		}).fail(function( jqxhr, textStatus, error ) {
			var err = error;
			showError(err,true);
		});
		
		event.preventDefault();
	});
	
}