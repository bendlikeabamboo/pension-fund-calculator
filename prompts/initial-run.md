Create a responsive svelte based static website that will simulate and visualize my company's pension fund.

# The Logic
There are three funds, Fund A, B, and C.
## Fund Explanation

### Fund C & B (The Match)
Employee agrees to give an entirely voluntary portion of their monthly salary to Fund C: either 4%, 7%, or 10%. Then whatever that value is, Company will provide a company match to that scheme, capped at 7%, to Fund B.

### Fund A (The Background)
Fund A is a little different in the sense that it's tied to your tenure at the company, not to the voluntary contribution. When less than 4 years tenure, that's 4% of monthly base. When higher, it becomes 8%.

## Retention Scheme
The crux: Fund B and Fund A (the company contributions) have vesting period. At less than 5 years of tenure, the funds are locked. At 5th year, you will unlock 50% of the two funds. at 6th year, you will unlock 60% of the funds. So on and so forth, until you're at your 10th year which makes you eligible to receive the full 100% of the company contributions. Outside 10th year, company still pays their match and you get 100% of those contributions.

Another factor is that once the funds B & C are collected (employee opted-out after opting-in), employee cannot enter the scheme again. Meanwhile, Fund A is strictly upon resignation only. No early pull-out.

# The Requirement
## Variables
I want the following variables to be adjustable and definable by the user:
- employment start date
- time-based monthly salary = what I mean by this: users can define a range of time and their salary at that range. this will account for any changes in salary
- start date and end date of voluntary contribution and percentage
- company exit date.

## Graph
Given the variables, I want to see a graph that illustrates how the money will grow month by month. Contributions should be identifiable in the stacked line/graph chart.

## APR
I also want a metric that shows the overall APR of the scheme at any point in time. This graph should answer if I exit at this point in the graph, how much APR of the total voluntary contribution that I contribute will be?

## Colors
I want this to be corporate-themed: professional, yet easy to navigate. Color Motif: #FF6200. We can also add other complementary colors to that color. Background color, warm off white.

## Visual Articles
Smooth animations, crisp text, and responsive page. To do this, we must detect and compute necessary refresh rate by checking the refresh rate of the user's monitor.