"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Card, CardHeader } from "@/components/ui/card"
import { useState } from "react"

const defaultCreateParams = {
  task_type: "",
  task_name: "",
  youtube_video_url: "",
}
export default function Template() {
  const form = useForm()

  const onSubmit = (values) => {
    console.log("Form submitted with values:", values);
    // Handle form submission logic here
  };

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="flex flex-col gap-2 w-full max-w-xl">
        <Card className="p-4">
          Create New Task
        </Card>
        <Card className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="shadcn" {...field} />
                    </FormControl>
                    <FormDescription>This is your public display name.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size="sm">Submit</Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  )
}
