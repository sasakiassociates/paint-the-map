/**
 * User: kgoulding
 * Date: 4/24/2018
 * Time: 10:38 AM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.GeoCoder
     **/
    SAS.GeoCoder = function (map, $searchDiv, searchBounds) {
        const _self = this;

        //region private fields and methods
        const _map = map;
        const _searchBounds = searchBounds;
        let _marker;
        const _init = function () {
            //Note: not using mapbox geocoder as it does not support all options of the mapbox REST API and documentation is poor
            // _self.geocoder = L.mapbox.geocoder('mapbox.places');

            const $searchInput = $('<input type="text" class="search-box" placeholder="search places">').appendTo($searchDiv);
            // const $searchButton = $('<button>').text('Search').appendTo($searchDiv).click(() => {
            //     geoCoder.search($searchInput.val());
            // });

            const _featuresById = {};

            $searchInput.autocomplete({
                source: (request, response) => {
                    // return _getSearchUrl(request.term);
                    $.getJSON(_getSearchUrl(request.term), (data) => {
                        // if (data.lbounds) {
                        //     _map.fitBounds(data.lbounds);
                        // } else if (data.latlng) {
                        //     _map.setView([data.latlng[0], data.latlng[1]], 13);
                        // }
                        response(data.features.map((f) => {
                            _featuresById[f.id] = f;
                            return {id: f.id, label: f.matching_text || f.text, feature: f}
                        }));
                    });
                },
                minLength: 2,
                select: function (event, ui) {
                    if (_marker) {
                        _map.removeLayer(_marker);
                        _marker = null;
                    }
                    // console.log("Selected: " + ui.item.value + " aka " + );
                    const feature = _featuresById[ui.item.id];
                    if (feature) {
                        const ll = [feature.center[1], feature.center[0]];
                        _marker = L.marker(ll).addTo(_map);
                        _map.panTo(ll);
                    }
                }
            }).data("ui-autocomplete")._renderItem = function (ul, item) {
                const feature = _featuresById[item.id];
                return $("<li class='search-result'>")
                    .append("<div class='title'>" + item.label + "</div><div class='sub-text'>" + _cleanPlaceName(item.label, feature) + "</div>")
                    .appendTo(ul);
            };
        };

        const _cleanPlaceName = function (label, feature) {
            let cleanName = feature.place_name || feature.text;
            const obviousPrefix = label + ', ';
            if (cleanName.startsWith(obviousPrefix)) {
                cleanName = cleanName.slice(obviousPrefix.length);
            }
            cleanName = cleanName.replace(', United States', '');

            return cleanName;
        };

        const _getSearchUrl = function (term) {
            const bbox = searchBounds;
            const center = _map.getCenter();
            const params = {
                access_token: L.mapbox.accessToken,
                proximity: center.lng + ',' + center.lat,
            };
            if (bbox) {
                params.bbox = bbox.join(',');
            }
            return `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(term)}.json?${$.param(params)}`;
            // $.getJSON(url, (data) => {
            //     if (data.lbounds) {
            //         _map.fitBounds(data.lbounds);
            //     } else if (data.latlng) {
            //         _map.setView([data.latlng[0], data.latlng[1]], 13);
            //     }
            // });

        };
        //endregion

        //region protected fields and methods (use 'p_' to differentiate).
        this.p_this = function () {
            return _self;
        };
        //endregion

        //region public API
        this.search = function (term) {

            // _self.geocoder.query({
            //     query: term,
            //     proximity: _map.getCenter(),
            //     // bbox: [-90.438, 34.721, -89.413, 35.504] -- supported by REST API but not JS API -- could run manually though...
            // }, (err, data) => {
            //     if (data.lbounds) {
            //         _map.fitBounds(data.lbounds);
            //     } else if (data.latlng) {
            //         _map.setView([data.latlng[0], data.latlng[1]], 13);
            //     }
            // });
        };
        //endregion

        _init();
    }
})();
