queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);
    
function makeGraphs(error, salaryData) {
    //create a cross filter
    var ndx=crossfilter(salaryData);
    
    //convert the string to value thats why the average salary not plotting
    salaryData.forEach(function(d){
        d.salary = parseInt(d.salary);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]);
         d.yrs_service = parseInt(d["yrs.service"]);
    })
    
    
    //function to show selector
    show_discipline_selector(ndx);
    //generic for men and women
    show_percent_that_are_professors(ndx,"Female","#percentage-of-women-professors");
    show_percent_that_are_professors(ndx,"Male","#percentage-of-men-professors");
  
    //function that will draw a graph thakes the ndx variable
    show_gender_balance(ndx);
    //function to plot chart average salary custom reducer
    show_average_salaries(ndx);
    show_rank_distribution(ndx);
    
    show_serive_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);
    dc.renderAll();
    
}

function show_discipline_selector(ndx){
    var dim = ndx.dimension(dc.pluck('discipline'));
    var group = dim.group();
    
    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
    
}

function show_percent_that_are_professors(ndx,gender,element){
   //caluclate % of women who are professors
   var percentageThatareProf=ndx.groupAll().reduce(
         function (p,v) {
               if(v.sex==gender)
               {
                   p.count++;
                   if(v.rank=="Prof"){
                   p.are_prof++;
                   }
               }
               return p;
            },
            function (p,v){
                if(v.sex==gender)
               {
                   p.count--;
                   if(v.rank=="Prof"){
                   p.are_prof--;
                   }
               }
               return p;
            },
            
            function(){
                return {count:0, are_prof:0};
            }
        );
        dc.numberDisplay(element)
           .formatNumber(d3.format(".2%"))
            .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatareProf)
}

function show_gender_balance(ndx){
    var dim=ndx.dimension(dc.pluck('sex'));
    var group= dim.group();
    
    dc.barChart("#gender-balance")
        .width(350)
        .height(250)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(group)
        .transitionDuration(500)//animates when we filter
        .x(d3.scale.ordinal())//dimension contains words male and female so scale.ordinal
        .xUnits(dc.units.ordinal)
        /*.elasticY(true)*/// remove this because only the y axis chnages not data to make data change remove this
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}

function  show_average_salaries(ndx){
    var dim= ndx.dimension(dc.pluck('sex'));
    function add_item(p,v){
        p.count++;
        p.total+=v.salary;
        p.average=p.total/p.count;
        return p;
    }
    function remove_item(p,v){
        p.count--;
        if(p.count==0){
            p.total=0;
            p.average=0;
        } else{
        p.total-=v.salary;
        p.average=p.total/p.count;
        }
        return p;
    }
    
    function initialise(){
        return {count: 0, total: 0, average: 0};
    }
    
    var averageSalaryByGender=dim.group().reduce(add_item, remove_item,initialise);
   
   //console.log(averageSalaryByGender.all());
   
     dc.barChart("#average-salary")
        .width(350)
        .height(250)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(averageSalaryByGender)
        //beacuse you used custom reducer ,the valueaccessor defines which of the three has to be plotted
        .valueAccessor(function(d){
            return d.value.average.toFixed(2);//two decimal places
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
        
}

function show_rank_distribution(ndx){
    var dim= ndx.dimension(dc.pluck('sex'));
    
    //work percentage for man for each rank
   
    function rankByGender(dimension,rank)
    {
      return dimension.group().reduce(
            function (p,v) {
               p.total++;
               if(v.rank==rank)
               {
                   p.match++;
               }
               return p;
            },
            function (p,v){
                p.total++;
               if(v.rank==rank)
               {
                   p.match--;
               }
               return p;
            },
            
            function(){
                return {total:0, match:0};
            }
        );
    }
    var profByGender=rankByGender(dim, "Prof");
    var asstProfByGender=rankByGender(dim, "AsstProf");
    var assocProfByGender=rankByGender(dim, "AssocProf");
    
    console.log(profByGender.all());
    
     dc.barChart("#rank-distribution")
        .width(350)
        .height(250)
        .dimension(dim)
        .group(profByGender,"Prof")
        .stack(assocProfByGender,"Assoc Prof")
        .valueAccessor(function(d)
        {
             if(d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            } else {
                return 0;
            }
              return d.value.percent * 100;
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 30})

}

function show_serive_to_salary_correlation(ndx){
    /*Here's our function and
 	we're going to create two dimensions the first dimension is going to be on years
    of service and we only use this to work out the bounds of the x-axis the minimum
 	and maximum years of service that we need to plot.The second dimension that
	we create actually returns an array with two parts; one being the year or years of
	service and the other being the salary and this is what allows us to plot the
	dots of the scatter plot at the right x and y coordinates
*/

    // adding colors to genders
      var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);
        
     var eDim = ndx.dimension(dc.pluck("yrs_service"));
     var experienceDim = ndx.dimension(function(d) {
       return [d.yrs_service, d.salary,d.rank,d.sex];
    });
     var experienceSalaryGroup = experienceDim.group();
     var minExperience = eDim.bottom(1)[0].yrs_service;
     var maxExperience = eDim.top(1)[0].yrs_service;
 
     dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        //plot horizontial scale is linear and domain is range 
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        //Size of dots
        .symbolSize(8)
        //room for dots
        .clipPadding(10)
        .xAxisLabel("Years Of Service")
        //what will appear when you hover on the dot key is from the dimension created
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        //how the chart pick up color which piece of data to use
        .colorAccessor(function (d) {
            return d.key[3];
        })
         .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});    
}


function show_phd_to_salary_correlation(ndx){
  
    // adding colors to genders
      var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);
        
     var pDim = ndx.dimension(dc.pluck("yrs_since_phd"));
     var phdDim = ndx.dimension(function(d) {
       return [d.yrs_since_phd, d.salary,d.rank,d.sex];
    });
     var phdSalaryGroup = phdDim.group();
     var minPhd = pDim.bottom(1)[0].yrs_since_phd;
     var maxPhd = pDim.top(1)[0].yrs_since_phd;
 
     dc.scatterPlot("#phd-salary")
        .width(800)
        .height(400)
        //plot horizontial scale is linear and domain is range 
        .x(d3.scale.linear().domain([minPhd, maxPhd]))
        .brushOn(false)
        //Size of dots
        .symbolSize(8)
        //room for dots
        .clipPadding(10)
        .xAxisLabel("Years Since PHD")
        //what will appear when you hover on the dot key is from the dimension created
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        //how the chart pick up color which piece of data to use
        .colorAccessor(function (d) {
            return d.key[3];
        })
         .colors(genderColors)
        .dimension(phdDim)
        .group(phdSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});    
}