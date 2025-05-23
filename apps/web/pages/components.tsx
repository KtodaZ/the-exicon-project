import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SearchBar } from "@/components/ui/searchbar";
import { TagList } from "@/components/ui/tag-list";
import { FilterPill } from "@/components/ui/filter-pill";
import { ActiveFilters } from "@/components/ui/active-filters";

export default function ComponentsPage() {
  return (
    <div className="container mx-auto py-10 space-y-10">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">The Exicon Project - Component Library</h1>
        <p className="text-gray-500 dark:text-gray-400">
          A showcase of the components used in the Exicon Project with the grayscale theme and #AD0C02 red accents.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="red">Red Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="link">Link Button</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="red">Red</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Navy Seal Burpee</CardTitle>
              <CardDescription>A classic exercise for any workout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-200 rounded-md mb-4"></div>
              <p>This is a classic exercise that can be worked into any THANG you might have in mind.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">burpee</Badge>
                <Badge variant="secondary">full-body</Badge>
                <Badge variant="red">chest</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm">View Details</Button>
              <span className="text-sm text-gray-500">Author: F3 Nation</span>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mountain Climber</CardTitle>
              <CardDescription>High-intensity cardio exercise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-200 rounded-md mb-4"></div>
              <p>A dynamic exercise that works your core, shoulders, and legs while elevating your heart rate.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">cardio</Badge>
                <Badge variant="secondary">core</Badge>
                <Badge variant="secondary">legs</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm">View Details</Button>
              <span className="text-sm text-gray-500">Author: N/A</span>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Search Input</h2>
        <div className="max-w-md">
          <div className="relative">
            <Input 
              type="search" 
              placeholder="Search exercises..." 
              className="pl-10"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">SearchBar Component</h2>
        <div className="max-w-md">
          <SearchBar
            placeholder="Search exercises..."
            buttonText="Search"
          />
        </div>
        <div className="max-w-md mt-4">
          <SearchBar
            placeholder="Search without button..."
            showButton={false}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Tag Lists</h2>
        <div>
          <h3 className="text-lg font-medium mb-2">Regular Tags</h3>
          <TagList
            tags={["cardio", "strength", "yoga", "mobility", "recovery"]}
          />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Tags with Counts</h3>
          <TagList
            tags={[
              { tag: "cardio", count: 42 },
              { tag: "strength", count: 85 },
              { tag: "yoga", count: 23 },
              { tag: "mobility", count: 18 },
              { tag: "recovery", count: 12 }
            ]}
          />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Active Tags</h3>
          <TagList
            tags={["cardio", "strength", "yoga", "mobility", "recovery"]}
            activeTags={["strength", "mobility"]}
            variant="red"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Spinners</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col items-center">
            <Spinner size="sm" />
            <span className="mt-2 text-sm">Small</span>
          </div>
          <div className="flex flex-col items-center">
            <Spinner />
            <span className="mt-2 text-sm">Medium</span>
          </div>
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <span className="mt-2 text-sm">Large</span>
          </div>
          <div className="flex flex-col items-center">
            <Spinner variant="primary" />
            <span className="mt-2 text-sm">Primary</span>
          </div>
          <div className="flex flex-col items-center">
            <Spinner variant="red" />
            <span className="mt-2 text-sm">Red</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Filter Pills</h2>
        <div className="flex flex-wrap gap-2">
          <FilterPill
            label="Search"
            value="burpee"
            onRemove={() => alert('Remove search filter')}
          />
          <FilterPill
            label="Tag"
            value="cardio"
            variant="gray"
            onRemove={() => alert('Remove tag filter')}
          />
          <FilterPill
            label="Category"
            value="strength"
            onRemove={() => alert('Remove category filter')}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Active Filters</h2>
        <ActiveFilters
          filters={[
            { type: 'Search', value: 'push-up' },
            { type: 'Tag', value: 'chest' },
            { type: 'Tag', value: 'bodyweight' }
          ]}
          onRemove={(filter) => alert(`Remove ${filter.type}: ${filter.value}`)}
          onClearAll={() => alert('Clear all filters')}
        />
      </section>
    </div>
  );
}