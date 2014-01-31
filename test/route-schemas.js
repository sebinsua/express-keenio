// I have a list of routes which define eventual schemas and their whitelists.
// I need a way of adding a route and its related schemas.
// I need a way of maintaining eventual schemas for each. Each route has three eventual schemas. An add method on the route, affects all three.
// I need a way of getting out the eventual schema of a route if it already exists.
// I need a way of converting an eventual schema into a whitelist representation like this:
// [ 'a.num', 'a.arr', 'b.arr[].name', 'b.arr[].types', 'b.value.type', 'b.value.name', 'c.arr' ]

// I need a way of saving this information (collated instances *OR* eventual schema *OR* whitelist) to disk.
// I need a way of loading this information (collated instances *OR* eventual schema *OR* whitelist) into a series of routes eventual schema objects.